/*
 *  Licensed to the Apache Software Foundation (ASF) under one or more
 *  contributor license agreements. See the NOTICE file distributed with
 *  this work for additional information regarding copyright ownership.
 *  The ASF licenses this file to You under the Apache License, Version 2.0
 *  (the "License"); you may not use this file except in compliance with
 *  the License. You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.catalog.resources.events;

import com.google.inject.Inject;
import io.swagger.annotations.Api;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.jdbi3.ChangeEventRepository;
import org.openmetadata.catalog.jdbi3.CollectionDAO;
import org.openmetadata.catalog.jdbi3.UsageRepository;
import org.openmetadata.catalog.resources.Collection;
import org.openmetadata.catalog.resources.teams.UserResource;
import org.openmetadata.catalog.security.CatalogAuthorizer;
import org.openmetadata.catalog.type.ChangeEvent;
import org.openmetadata.catalog.type.ChangeEvent.EventType;
import org.openmetadata.catalog.type.EntityUsage;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.ResultList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.validation.Valid;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;
import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Path("/v1/events")
@Api(value = "Events resource", tags = "Events resource")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "events")
public class EventsResource {
  private final ChangeEventRepository dao;

  @Inject
  public EventsResource(CollectionDAO dao, CatalogAuthorizer authorizer) {
    Objects.requireNonNull(dao, "ChangeEventRepository must not be null");
    this.dao = new ChangeEventRepository(dao);
  }

  @GET
  @Valid
  @Operation(summary = "Get change events", tags = "usage",
          description = "Get a list of change events matching event types, entity type, from a given date",
          responses = {
                  @ApiResponse(responseCode = "200", description = "Entity events",
                          content = @Content(mediaType = "application/json",
                          schema = @Schema(implementation = ChangeEvent.class))),
                  @ApiResponse(responseCode = "404", description = "Entity for instance {id} is not found")
          })
  public ResultList<ChangeEvent> get(
          @Context UriInfo uriInfo,
          @Parameter(description = "Entity type for which usage is requested",
                  required = true,
                  schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @QueryParam("entityTypes") List<String> entityTypes,
          @Parameter(description = "Event types",
                  required = true,
                  schema = @Schema(type = "string"))
          @PathParam("eventTypes") List<String> eventTypes,
          @Parameter(description = "Events since this date and time (inclusive) in ISO 8601 format.",
                  required = true,
                  schema = @Schema(type = "string"))
          @QueryParam("date") String date) throws IOException {
    return dao.list(date, eventTypes, entityTypes);
  }
}