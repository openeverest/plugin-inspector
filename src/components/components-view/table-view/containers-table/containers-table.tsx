import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@openeverest/ui-lib';
import { ComponentAge } from 'components/component-age/component-age';
import { useInspectorContext } from 'components/inspector-context/inspector.context';
import { StatusIndicator } from 'components/status-indicator/status-indicator';
import { InstanceComponent } from 'types/components.types';
import {
  containerBaseStatus,
  containerHasLogs,
} from 'utils/component-status.utils';
import { Messages } from '../../components-view.messages';

interface ContainersTableProps {
  component: InstanceComponent;
}

export const ContainersTable = ({ component }: ContainersTableProps) => {
  const { viewLogs } = useInspectorContext();

  return (
    <Table size="small" data-testid={`containers-${component.name}`}>
      <TableBody>
        {component.containers.map((container) => (
          <TableRow key={container.name} sx={{ '& td': { border: 0 } }}>
            <TableCell>
              <StatusIndicator
                status={containerBaseStatus(container)}
                label={container.status}
                reason={container.reason}
              />
            </TableCell>
            <TableCell>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {Messages.containerReady(container.ready)}
              </Typography>
            </TableCell>
            <TableCell>{container.name}</TableCell>
            <TableCell>
              <ComponentAge date={container.started} />
            </TableCell>
            <TableCell>{container.restarts}</TableCell>
            <TableCell align="right">
              {containerHasLogs(container) && (
                <Tooltip title={Messages.viewLogs}>
                  <IconButton
                    size="small"
                    aria-label={Messages.viewLogs}
                    onClick={() => viewLogs(component.name, container.name)}
                  >
                    <VisibilityOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
