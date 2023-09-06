/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import Icon from '@ant-design/icons';
import { Button, Modal, Typography } from 'antd';
import { ReactComponent as GrantAccessIcon } from 'assets/svg/ic-request-access.svg';
import { AxiosError } from 'axios';
import { User } from 'generated/entity/teams/user';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserById } from 'rest/userAPI';
import { showErrorToast } from 'utils/ToastUtils';
import { AccessRequestButtonProps } from './AccessRequest.interface';

const AccessRequestButton = ({
  requesterId,
  entityOwnerId,
  entityType,
  entityName,
}: AccessRequestButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [ownerData, setOwnerData] = useState<User>({} as User);
  const [requesterData, setRequesterData] = useState<User>({} as User);
  const [requestId, setRequestId] = useState<string>();
  const { t } = useTranslation();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setConfirmLoading(true);
    handleRequestAccess();
  };

  const handleOk2 = () => {
    setIsModalOpen2(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleCancel2 = () => {
    setIsModalOpen2(false);
  };

  const fetchOwnerData = () => {
    if (entityOwnerId) {
      setOwnerData({} as User);
      getUserById(entityOwnerId, 'profile')
        .then((res) => {
          if (res) {
            setOwnerData(res);
          } else {
            throw t('server.unexpected-response');
          }
        })
        .catch((err: AxiosError) => {
          //this error is  raised when entity owner is an Team not an User
          console.log(err);
          setConfirmLoading(false);
        })
        .finally(() => setConfirmLoading(false));
    }
  };
  useEffect(() => {
    fetchOwnerData();
  }, [entityOwnerId]);

  const fetchRequesterData = () => {
    if (requesterId) {
      setOwnerData({} as User);
      getUserById(requesterId, 'profile')
        .then((res) => {
          if (res) {
            setRequesterData(res);
          } else {
            throw t('server.unexpected-response');
          }
        })
        .catch((err: AxiosError) => {
          showErrorToast(
            err,
            t('server.entity-fetch-error', {
              entity: 'User Details',
            })
          );
          setConfirmLoading(false);
        })
        .finally(() => setConfirmLoading(false));
    }
  };
  useEffect(() => {
    fetchRequesterData();
  }, [requesterId]);

  const handleRequestAccess = async () => {
    try {
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseTypeID: 'ING-Approval-Work-DataApproval',
          content: {
            pxSkipCreateView: 'true',
            RequestDetails: {
              BusinessJustification: 'no',
              AssetRequested: {
                ArtifactId: 'd32dd-2d2d',
                CatalogId: 'sa23-232x-cc',
                ConnectionPaths: entityType,
                Name: entityName,
                Approvers: [
                  {
                    pyUserIdentifier: 'hf35bf',
                    pyFullname: ownerData.displayName,
                    pyEmail1: ownerData.email,
                    pyFirstName: ownerData.name,
                    pyLastName: ownerData.name,
                  },
                ],
              },
            },
          },
        }),
      };
      const resp = await window
        .fetch(
          'https://gsxxopp-dev.ing.net/prweb/api/ApprovalManagement/v1/cases',
          requestOptions
        )
        .then((response) => response.json());

      setRequestId(resp.ID);

      setConfirmLoading(false);
      setIsModalOpen(false);
      setIsModalOpen2(true);
    } catch (error) {
      setConfirmLoading(false);
    }
  };

  return (
    <>
      <Modal
        title="You are requesting access to:"
        confirmLoading={confirmLoading}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}>
        <p>type: {entityType} </p>
        <p>name: {entityName}</p>
        <p>requester: {requesterData.displayName}</p>
        <p>owner: {ownerData.displayName}</p>
      </Modal>
      <Modal
        title="Your request was succesfully submited"
        open={isModalOpen2}
        onOk={handleOk2}
        onCancel={handleCancel2}>
        <p> Submitted approval workflow ID : {requestId} </p>
        <br></br>
        <p>
          {' '}
          <Typography.Link
            href="https://gsxxopp-dev.ing.net/prweb/app/approvalmanagement_/"
            target="_blank"
            style={{ fontSize: '14px' }}>
            click here to open approval workflow manager
          </Typography.Link>
        </p>
      </Modal>
      <Button
        icon={<Icon component={GrantAccessIcon} height={18} width={18} />}
        onClick={showModal}>
        <Typography.Text>Request Access</Typography.Text>
      </Button>
    </>
  );
};

export default AccessRequestButton;
