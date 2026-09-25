import { Box, Stack, Typography } from '@openeverest/ui-lib';
import { BASE_STATUS_COLOR } from './status-indicator.constants';
import { StatusIndicatorProps } from './status-indicator.types';

export const StatusIndicator = ({ status, label, reason }: StatusIndicatorProps) => (
  <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
    <Box
      data-testid={`status-${status}`}
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: BASE_STATUS_COLOR[status],
        flexShrink: 0,
      }}
    />
    <Stack>
      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
        {label}
      </Typography>
      {reason && (
        <Typography variant="caption" sx={{ color: BASE_STATUS_COLOR[status], lineHeight: 1.2 }}>
          {reason}
        </Typography>
      )}
    </Stack>
  </Stack>
);
