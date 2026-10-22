import type { NodeProps } from '@xyflow/react';
import LanOutlinedIcon from '@mui/icons-material/LanOutlined';
import { Stack, Tooltip, Typography } from '@mui/material';
import { ServiceStatus } from 'components/service-status/service-status';
import {
  formatServicePorts,
  readyEndpointCount,
} from 'utils/service-status.utils';
import { Messages } from '../../components-view.messages';
import {
  ELLIPSIS_SX,
  SERVICE_NODE_HEIGHT,
  SERVICE_NODE_WIDTH,
} from '../diagram-view.constants';
import { ServiceNodeType } from '../diagram-view.types';
import { DiagramNode } from '../diagram-node/diagram-node';

export const ServiceNode = ({ data }: NodeProps<ServiceNodeType>) => {
  const service = data.componentData;
  const { name, clusterIP, externalAddresses, ports, pods } = service;
  const address = [...externalAddresses, clusterIP, formatServicePorts(ports)]
    .filter(Boolean)
    .join(' · ');

  return (
    <DiagramNode
      width={SERVICE_NODE_WIDTH}
      height={SERVICE_NODE_HEIGHT}
      showBottomHandle
      dataTestId={`service-node-${name}`}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start' }}>
        <ServiceStatus service={service} />
        <Typography variant="body2" sx={{ ml: 'auto', whiteSpace: 'nowrap' }}>
          {Messages.endpointsReady(readyEndpointCount(service), pods.length)}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: 2, minWidth: 0 }}>
        <Tooltip title={Messages.service}>
          <LanOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        </Tooltip>
        <Tooltip title={name} placement="right" arrow>
          <Typography variant="body1" sx={ELLIPSIS_SX}>
            {name}
          </Typography>
        </Tooltip>
      </Stack>
      <Tooltip title={address} placement="right" arrow>
        <Typography variant="caption" sx={{ ...ELLIPSIS_SX, color: 'text.secondary' }}>
          {address}
        </Typography>
      </Tooltip>
    </DiagramNode>
  );
};
