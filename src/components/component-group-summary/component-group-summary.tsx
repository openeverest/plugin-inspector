import { Stack, Typography } from '@mui/material';
import { StatusIndicator } from 'components/status-indicator/status-indicator';
import { ComponentGroup } from 'types/components.types';
import { summarizeGroup } from 'utils/component-groups.utils';
import { Messages } from './component-group-summary.messages';

interface ComponentGroupSummaryProps {
  group: ComponentGroup;
}

export const ComponentGroupSummary = ({ group }: ComponentGroupSummaryProps) => {
  const { status, ready, total } = summarizeGroup(group);
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 2, minWidth: 0 }}>
      <StatusIndicator status={status} label={group.name || Messages.ungrouped} />
      <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
        {Messages.podsReady(ready, total)}
      </Typography>
    </Stack>
  );
};
