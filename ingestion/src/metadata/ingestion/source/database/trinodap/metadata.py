#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""
Trino source implementation.
"""

import traceback
import json
import os

from typing import Any, Dict, Iterable, List, Optional, Tuple

from metadata.generated.schema.entity.data.database import Database
from metadata.generated.schema.entity.data.databaseSchema import DatabaseSchema

from metadata.ingestion.source.database.trino.metadata import TrinoSource
from metadata.generated.schema.entity.services.connections.database.trinoDapConnection import (
    TrinoDapConnection,
)
from metadata.generated.schema.entity.services.connections.database.trinodapGenesisDatabasesTypes import (
    GenesisDatabaseType,
)
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)

from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.ingestion.api.source import InvalidSourceException

from metadata.utils import fqn
from metadata.utils.filters import filter_by_database
from metadata.utils.logger import ingestion_logger

from oauthlib.oauth2 import LegacyApplicationClient
from requests_oauthlib import OAuth2Session
from metadata.generated.schema.api.data.createDatabaseSchema import (
    CreateDatabaseSchemaRequest,
)
from metadata.utils.filters import filter_by_schema

logger = ingestion_logger()
ROW_DATA_TYPE = "row"
ARRAY_DATA_TYPE = "array"


class TrinodapSource(TrinoSource):
    """
    Trino does not support querying by table type: Getting views is not supported.
    """
    allowed_dbs = []

    @classmethod
    def create(cls, config_dict, metadata_config: OpenMetadataConnection):
        config = WorkflowSource.parse_obj(config_dict)
        connection: TrinoDapConnection = config.serviceConnection.__root__.config
        if not isinstance(connection, TrinoDapConnection):
            raise InvalidSourceException(
                f"Expected TrinoDapConnection, but got {connection}"
            )
        return cls(config, metadata_config)

    def get_oauth_session(self) -> OAuth2Session:
        os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
        oauth = OAuth2Session(client=LegacyApplicationClient(client_id='client_id'))
        token = oauth.fetch_token(token_url='http://192.168.0.203:8888/token',
                                  username=self.service_connection.genesisNpaUser,
                                  password=self.service_connection.genesisNpaPassword.get_secret_value()
                                  )
        logger.info('OIDC session successfully established')
        logger.info(f'received OIDC bearer token : {token}')
        return oauth

    def pull_genesis_entities(self, entity_type, limit=2):
        entity_type = entity_type.lower()
        oauth = self.get_oauth_session()
        i = 0
        while True:
            offset = limit * i
            url = f'{self.service_connection.genesisUrl}/{entity_type}' \
                  f'?matchString=' \
                  f'&offset={offset}' \
                  f'&limit={limit}' \
                  f'&filterDeleted=true'

            resp = oauth.get(url)
            resp_json = resp.json()
            logger.info(url)
            logger.info(resp_json)
            if not resp_json:
                oauth.close()
                break
            for entity in resp.json():
                logger.info(f'Adding genesis {entity_type[:-1]} {entity["name"]} to allow list ')
                self.allowed_dbs.append(entity['name'])
            i += 1

    def generate_allowed_dbs(self):
        dbtype = self.service_connection.genesisDatabaseType
        if dbtype in (GenesisDatabaseType.DATASOURCES, GenesisDatabaseType.PROJECTS):
            self.pull_genesis_entities(dbtype.value)
        elif dbtype == GenesisDatabaseType.ALL:
            self.pull_genesis_entities(GenesisDatabaseType.DATASOURCES.value)
            self.pull_genesis_entities(GenesisDatabaseType.PROJECTS.value)
        else:
            raise Exception(f'Unsuported genesisDatabaseType: {dbtype}')

    def get_database_names(self) -> Iterable[str]:
        configured_catalog = self.service_connection.catalog
        if configured_catalog:
            self.set_inspector(database_name=configured_catalog)
            yield configured_catalog
        else:
            results = self.connection.execute("SHOW CATALOGS")
            for res in results:
                if res:
                    new_catalog = res[0]
                    database_fqn = fqn.build(
                        self.metadata,
                        entity_type=Database,
                        service_name=self.context.database_service.name.__root__,
                        database_name=new_catalog,
                    )
                    if new_catalog not in self.allowed_dbs:
                        self.status.filter(database_fqn, "Database Filtered Out")
                    else:

                        if filter_by_database(
                                self.source_config.databaseFilterPattern,
                                database_fqn
                                if self.source_config.useFqnForFiltering
                                else new_catalog,
                        ):
                            self.status.filter(database_fqn, "Database Filtered Out")
                            continue

                        try:
                            self.set_inspector(database_name=new_catalog)
                            yield new_catalog
                        except Exception as err:
                            logger.debug(traceback.format_exc())
                            logger.warning(
                                f"Error trying to connect to database {new_catalog}: {err}"
                            )

    def get_database_schema_names(self) -> Iterable[str]:

        catalog_name = self.context.database.name.__root__
        results = self.connection.execute(f"SHOW SCHEMAS IN {catalog_name}")
        self.generate_allowed_dbs()
        for res in results:
            try:
                schema = res[0]
                schema_fqn = fqn.build(
                    self.metadata,
                    entity_type=DatabaseSchema,
                    service_name=self.context.database_service.name.__root__,
                    database_name=self.context.database.name.__root__,
                    schema_name=schema,
                )
                if schema not in self.allowed_dbs or filter_by_schema(
                        self.config.sourceConfig.config.schemaFilterPattern,
                        schema_fqn
                        if self.config.sourceConfig.config.useFqnForFiltering
                        else schema,
                ):
                    logger.info(f'FILTERED OUT:  {schema_fqn} ')
                    self.status.filter(schema_fqn, "Schema Filtered Out")
                    continue

                logger.info(f'QUEUED FOR METADATA INGESTION: {schema_fqn}')
                yield schema
            except Exception as exc:
                error = f"Unexpected exception to get database schema [{schema}]: {exc}"
                logger.debug(traceback.format_exc())
                logger.warning(error)
                self.status.failed(schema, error, traceback.format_exc())

    def yield_database_schema(
            self, schema_name: str
    ) -> Iterable[CreateDatabaseSchemaRequest]:
        """
        From topology.
        Prepare a database schema request and pass it to the sink
        """
        yield CreateDatabaseSchemaRequest(
            name=schema_name,
            database=self.context.database.fullyQualifiedName,
        )
