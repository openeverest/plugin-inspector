import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ServiceStatus } from 'components/service-status/service-status';
import { InstanceService } from 'types/services.types';
import {
  formatServicePorts,
  readyEndpointCount,
} from 'utils/service-status.utils';
import { Messages } from '../../components-view.messages';

interface ServicesTableProps {
  services: InstanceService[];
}

export const ServicesTable = ({ services }: ServicesTableProps) => (
  <TableContainer data-testid="services-table">
    <Typography variant="subtitle2" sx={{ px: 2, pt: 3, pb: 1 }}>
      {Messages.services}
    </Typography>
    <Table size="small">
      <TableHead>
        <TableRow>
          {Object.values(Messages.serviceColumns).map((label) => (
            <TableCell key={label}>{label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {services.map((service) => (
          <TableRow key={service.name} hover>
            <TableCell>
              <ServiceStatus service={service} />
            </TableCell>
            <TableCell>{service.name}</TableCell>
            <TableCell>{service.clusterIP}</TableCell>
            <TableCell>{service.externalAddresses.join(', ')}</TableCell>
            <TableCell>{formatServicePorts(service.ports)}</TableCell>
            <TableCell>
              {Messages.endpointsReady(readyEndpointCount(service), service.pods.length)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);
