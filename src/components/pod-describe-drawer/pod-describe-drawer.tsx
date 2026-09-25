import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@openeverest/ui-lib';
import { InstanceTarget } from 'api/inspector-api';
import { usePodDescription } from 'hooks/usePodDescription';
import { DescribeBody } from './describe-body/describe-body';
import { DRAWER_WIDTH } from './pod-describe-drawer.constants';
import { Messages } from './pod-describe-drawer.messages';

interface PodDescribeDrawerProps {
  target: InstanceTarget;
  pod: string | null;
  onClose: () => void;
}

export const PodDescribeDrawer = ({ target, pod, onClose }: PodDescribeDrawerProps) => {
  const { data, isLoading, error } = usePodDescription(target, pod);

  return (
    <Drawer anchor="right" open={pod !== null} onClose={onClose}>
      <Box sx={{ width: DRAWER_WIDTH, maxWidth: '100vw', p: 3 }} data-testid="pod-describe-drawer">
        <Stack direction="row" sx={{ alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>
            {pod && Messages.title(pod)}
          </Typography>
          <Tooltip title={Messages.close}>
            <IconButton onClick={onClose} aria-label={Messages.close} sx={{ ml: 'auto' }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{Messages.loadFailed(error.message)}</Alert>}
        {data && <DescribeBody description={data} />}
      </Box>
    </Drawer>
  );
};
