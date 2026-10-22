import type { NodeProps } from '@xyflow/react';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Stack } from '@mui/material';
import { ComponentGroupSummary } from 'components/component-group-summary/component-group-summary';
import { Messages } from '../../components-view.messages';
import { GROUP_HEADER_HEIGHT } from '../diagram-view.constants';
import { GroupNodeType } from '../diagram-view.types';

// A click on the header bubbles to the diagram, which collapses or expands the group.
export const GroupNode = ({ data, width, height }: NodeProps<GroupNodeType>) => {
  const group = data.componentData;
  const ToggleIcon = data.collapsed ? ExpandMoreIcon : ExpandLessIcon;

  return (
    <Box
      data-testid={`group-node-${group.name}`}
      sx={{
        width,
        height,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'action.hover',
      }}
    >
      <Stack
        direction="row"
        role="button"
        aria-expanded={!data.collapsed}
        aria-label={data.collapsed ? Messages.expandGroup : Messages.collapseGroup}
        sx={{
          alignItems: 'center',
          gap: 1,
          px: 3,
          height: GROUP_HEADER_HEIGHT,
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        <ComponentGroupSummary group={group} />
        <ToggleIcon sx={{ ml: 'auto', color: 'text.secondary' }} />
      </Stack>
    </Box>
  );
};
