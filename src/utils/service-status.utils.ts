import { BaseStatus } from 'components/status-indicator/status-indicator.types';
import { InstanceService, ServicePort } from 'types/services.types';

const LOAD_BALANCER = 'LoadBalancer';

export const isExternalAddressPending = ({ type, externalAddresses }: InstanceService) =>
  type === LOAD_BALANCER && externalAddresses.length === 0;

export const readyEndpointCount = ({ pods }: InstanceService) =>
  pods.filter((pod) => pod.ready).length;

// Unreachable when no selected pod is a ready endpoint; degraded while some aren't
// or a load balancer has no address yet.
export const serviceBaseStatus = (service: InstanceService): BaseStatus => {
  const ready = readyEndpointCount(service);
  if (ready === 0) {
    return 'error';
  }
  if (ready < service.pods.length || isExternalAddressPending(service)) {
    return 'pending';
  }
  return 'success';
};

// kubectl's PORT(S) notation, e.g. 27017/TCP or 27017:31017/TCP.
export const formatServicePorts = (ports: ServicePort[]) =>
  ports
    .map(({ port, nodePort, protocol }) => `${port}${nodePort ? `:${nodePort}` : ''}/${protocol}`)
    .join(', ');
