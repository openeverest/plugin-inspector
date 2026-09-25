import type { NodeProps } from '@xyflow/react';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@openeverest/ui-lib';
import { ComponentAge } from 'components/component-age/component-age';
import { useInspectorContext } from 'components/inspector-context/inspector.context';
import { StatusIndicator } from 'components/status-indicator/status-indicator';
import {
  containerBaseStatus,
  containerHasLogs,
} from 'utils/component-status.utils';
import { Messages } from '../../components-view.messages';
import {
  CONTAINER_NODE_HEIGHT,
  CONTAINER_NODE_WIDTH,
  ELLIPSIS_SX,
} from '../diagram-view.constants';
import { ContainerNodeType } from '../diagram-view.types';
import { DiagramNode } from '../diagram-node/diagram-node';

export const ContainerNode = ({ data }: NodeProps<ContainerNodeType>) => {
  const container = data.componentData;
  const { status, ready, name, started, restarts } = container;
  const { viewLogs } = useInspectorContext();

  return (
    <DiagramNode
      width={CONTAINER_NODE_WIDTH}
      height={CONTAINER_NODE_HEIGHT}
      showTopHandle
      dataTestId={`container-node-${name}`}
    >
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <StatusIndicator
          status={containerBaseStatus(container)}
          label={status}
          reason={container.reason}
        />
        <Typography variant="body2" sx={{ ml: 'auto' }}>
          {Messages.containerReady(ready)}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', mt: 2 }}>
        <Typography variant="body1" sx={ELLIPSIS_SX}>
          {name}
        </Typography>
        {data.parentId && containerHasLogs(container) && (
          <Tooltip title={Messages.viewLogs}>
            <IconButton
              onClick={() => data.parentId && viewLogs(data.parentId, name)}
              size="small"
              aria-label={Messages.viewLogs}
              sx={{ ml: 'auto' }}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <ComponentAge
        date={started}
        render={(age) => Messages.ageAndRestarts(age, restarts)}
      />
    </DiagramNode>
  );
};
