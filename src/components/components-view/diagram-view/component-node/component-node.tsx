import type { MouseEvent } from 'react';
import type { NodeProps } from '@xyflow/react';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@openeverest/ui-lib';
import { ComponentAge } from 'components/component-age/component-age';
import { useInspectorContext } from 'components/inspector-context/inspector.context';
import { StatusIndicator } from 'components/status-indicator/status-indicator';
import { componentBaseStatus, hasLogs } from 'utils/component-status.utils';
import { Messages } from '../../components-view.messages';
import {
  COMPONENT_NODE_HEIGHT,
  COMPONENT_NODE_WIDTH,
  ELLIPSIS_SX,
} from '../diagram-view.constants';
import { ComponentNodeType } from '../diagram-view.types';
import { DiagramNode } from '../diagram-node/diagram-node';

export const ComponentNode = ({ data }: NodeProps<ComponentNodeType>) => {
  const component = data.componentData;
  const { name, status, ready, type, restarts, started, nodeName } = component;
  const { viewLogs } = useInspectorContext();

  const handleViewLogs = (e: MouseEvent) => {
    e.stopPropagation();
    viewLogs(name);
  };

  return (
    <DiagramNode
      width={COMPONENT_NODE_WIDTH}
      height={COMPONENT_NODE_HEIGHT}
      elevated={data.selected}
      clickable
      showBottomHandle
      dataTestId={`component-node-${name}`}
    >
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <StatusIndicator status={componentBaseStatus(component)} label={status} />
        <Typography variant="body1" sx={{ ml: 'auto' }}>
          {Messages.readyCount(ready)}
        </Typography>
      </Stack>
      <Stack sx={{ mt: 2 }}>
        <Tooltip title={name} placement="right" arrow>
          <Typography variant="body1" sx={ELLIPSIS_SX}>
            {name}
          </Typography>
        </Tooltip>
        <ComponentAge
          date={started}
          variant="body2"
          render={(age) => Messages.ageAndRestarts(age, restarts)}
        />
        {nodeName && (
          <Typography variant="caption" sx={{ ...ELLIPSIS_SX, color: 'text.secondary' }}>
            {Messages.onNode(nodeName)}
          </Typography>
        )}
      </Stack>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 'auto',
        }}
      >
        {type ? <Chip label={type} size="small" /> : <span />}
        {hasLogs(component) && (
          <Tooltip title={Messages.viewLogs}>
            <IconButton
              onClick={handleViewLogs}
              size="small"
              aria-label={Messages.viewLogs}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </DiagramNode>
  );
};
