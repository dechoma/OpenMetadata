
import Icon from '@ant-design/icons';
import {
  Button,
  Modal,
  Typography,
} from 'antd';
import { AxiosError } from 'axios';
import { showErrorToast } from 'utils/ToastUtils';
import { ReactComponent as GrantAccessIcon } from 'assets/svg/ic-request-access.svg';
import React, { useEffect, useState } from 'react';
import { getUserById } from 'rest/userAPI';
import { User } from 'generated/entity/teams/user';
import { AccessRequestButtonProps } from './AccessRequest.interface';
import { useTranslation } from 'react-i18next';

const AccessRequestButton = ({
  requesterId,
  entityOwnerId,
  entityType,
  entityName
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
        showErrorToast(
          err,
          t('server.entity-fetch-error', {
            entity: 'User Details',
          })
        );
        setConfirmLoading(false);
      })
      .finally(() => setConfirmLoading(false));
      };
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
      };
  };
  useEffect(() => {
    fetchRequesterData();
  }, [requesterId]);

  const handleRequestAccess = async () => {
    try {
      const requestOptions = {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa('datauser1:rules'),
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
                ConnectionPaths: entityName,
                Name: entityType,
                Approvers: [
                  {
                    pyUserIdentifier: ownerData.id,
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
          'https://gsxxopp-dev.ing.net/prweb/api/v1/cases/',
          requestOptions
        )
        .then((response) => response.json());

      setRequestId(resp.id);

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
         <p></p>
         <p>
           {' '}
           <Typography.Link
             href="https://gsxxopp-dev.ing.net/prweb/"
             target="_blank"
             style={{ fontSize: '16px' }}>
             click here to open approval workflow manager
           </Typography.Link>
         </p>
       </Modal>
       <Button
         icon={
           <Icon component={GrantAccessIcon} height={18} width={18} />
         }
         onClick={showModal}>
         <Typography.Text>Request Access</Typography.Text>
       </Button>
       </>
  );
};

export default AccessRequestButton;
