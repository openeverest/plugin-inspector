import { Paper, Stack, Typography } from '@openeverest/ui-lib';
import { ContainerDescription } from 'types/describe.types';
import { FieldList } from '../field-list/field-list';
import { Messages } from '../pod-describe-drawer.messages';
import { formatResources, formatState } from '../pod-describe-drawer.utils';

interface DescribeContainerProps {
  container: ContainerDescription;
}

export const DescribeContainer = ({ container }: DescribeContainerProps) => {
  const { state, lastTermination } = container;

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mb: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          {container.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: container.ready ? 'success.main' : 'warning.main' }}
        >
          {container.ready ? Messages.container.ready : Messages.container.notReady}
        </Typography>
      </Stack>
      <FieldList
        fields={[
          { label: Messages.container.image, value: container.image },
          { label: Messages.container.state, value: formatState(state) },
          { label: Messages.columns.message, value: state.message },
          {
            label: Messages.container.lastTermination,
            value: lastTermination && formatState(lastTermination),
          },
          { label: Messages.container.restarts, value: String(container.restarts) },
          { label: Messages.container.requests, value: formatResources(container.requests) },
          { label: Messages.container.limits, value: formatResources(container.limits) },
        ]}
      />
    </Paper>
  );
};
