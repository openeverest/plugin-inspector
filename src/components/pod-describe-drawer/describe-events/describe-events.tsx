import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@openeverest/ui-lib';
import { PodEvent } from 'types/describe.types';
import { Messages } from '../pod-describe-drawer.messages';
import { timeAgo } from '../pod-describe-drawer.utils';

interface DescribeEventsProps {
  events: PodEvent[];
}

export const DescribeEvents = ({ events }: DescribeEventsProps) => {
  if (events.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {Messages.noEvents}
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{Messages.columns.type}</TableCell>
          <TableCell>{Messages.columns.reason}</TableCell>
          <TableCell>{Messages.columns.lastSeen}</TableCell>
          <TableCell>{Messages.columns.count}</TableCell>
          <TableCell>{Messages.columns.source}</TableCell>
          <TableCell>{Messages.columns.message}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {events.map((event, index) => (
          <TableRow key={`${event.reason}-${event.lastSeen}-${index}`}>
            <TableCell>
              <Chip
                size="small"
                label={event.type}
                color={event.type === 'Warning' ? 'warning' : 'default'}
              />
            </TableCell>
            <TableCell>{event.reason}</TableCell>
            <TableCell>
              <Tooltip title={event.lastSeen ?? ''}>
                <span>{timeAgo(event.lastSeen)}</span>
              </Tooltip>
            </TableCell>
            <TableCell>{event.count}</TableCell>
            <TableCell>{event.source ?? Messages.none}</TableCell>
            <TableCell sx={{ wordBreak: 'break-word' }}>{event.message}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
