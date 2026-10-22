import { StatusIndicator } from 'components/status-indicator/status-indicator';
import { InstanceService } from 'types/services.types';
import {
  isExternalAddressPending,
  serviceBaseStatus,
} from 'utils/service-status.utils';
import { Messages } from './service-status.messages';

interface ServiceStatusProps {
  service: InstanceService;
}

export const ServiceStatus = ({ service }: ServiceStatusProps) => (
  <StatusIndicator
    status={serviceBaseStatus(service)}
    label={service.headless ? Messages.headless : service.type}
    reason={isExternalAddressPending(service) ? Messages.externalAddressPending : undefined}
  />
);
