import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@openeverest/ui-lib';
import { PodCondition } from 'types/describe.types';
import { Messages } from '../pod-describe-drawer.messages';

interface DescribeConditionsProps {
  conditions: PodCondition[];
}

export const DescribeConditions = ({ conditions }: DescribeConditionsProps) => {
  if (conditions.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {Messages.noConditions}
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{Messages.columns.type}</TableCell>
          <TableCell>{Messages.columns.status}</TableCell>
          <TableCell>{Messages.columns.reason}</TableCell>
          <TableCell>{Messages.columns.message}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {conditions.map((condition) => (
          <TableRow key={condition.type}>
            <TableCell>{condition.type}</TableCell>
            <TableCell
              sx={{
                color: condition.status === 'True' ? 'success.main' : 'warning.main',
                fontWeight: 'bold',
              }}
            >
              {condition.status}
            </TableCell>
            <TableCell>{condition.reason ?? Messages.none}</TableCell>
            <TableCell sx={{ wordBreak: 'break-word' }}>
              {condition.message ?? Messages.none}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
