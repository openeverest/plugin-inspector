import { BaseStatus } from 'components/status-indicator/status-indicator.types';
import {
  ComponentStatus,
  Container,
  ContainerStatus,
  InstanceComponent,
} from 'types/components.types';

// Pending pods sort first when ordering by status descending.
export const COMPONENT_STATUS_WEIGHT: Record<ComponentStatus, number> = {
  [ComponentStatus.Pending]: 1,
  [ComponentStatus.Failed]: 0,
  [ComponentStatus.Running]: 0,
  [ComponentStatus.Succeeded]: 0,
  [ComponentStatus.Unknown]: 0,
};

const COMPONENT_STATUS_TO_BASE_STATUS: Record<ComponentStatus, BaseStatus> = {
  [ComponentStatus.Pending]: 'pending',
  [ComponentStatus.Failed]: 'error',
  [ComponentStatus.Running]: 'pending',
  [ComponentStatus.Succeeded]: 'success',
  [ComponentStatus.Unknown]: 'unknown',
};

const CONTAINER_STATUS_TO_BASE_STATUS: Record<ContainerStatus, BaseStatus> = {
  [ContainerStatus.Running]: 'success',
  [ContainerStatus.Waiting]: 'pending',
  [ContainerStatus.Terminated]: 'paused',
};

const isFullyReady = (ready: string) => {
  const [readyCount, total] = ready.split('/');
  return total !== undefined && readyCount === total;
};

// A running pod is only healthy once all its containers are ready.
export const componentBaseStatus = ({
  status,
  ready,
}: Pick<InstanceComponent, 'status' | 'ready'>): BaseStatus => {
  if (status === ComponentStatus.Running && isFullyReady(ready)) {
    return 'success';
  }
  return COMPONENT_STATUS_TO_BASE_STATUS[status] ?? 'unknown';
};

export const containerBaseStatus = ({
  status,
  ready,
}: Pick<Container, 'status' | 'ready'>): BaseStatus => {
  if (status === ContainerStatus.Running && !ready) {
    return 'pending';
  }
  return CONTAINER_STATUS_TO_BASE_STATUS[status] ?? 'unknown';
};

// Pending pods and waiting containers have no logs yet.
export const hasLogs = (component: InstanceComponent) =>
  component.status !== ComponentStatus.Pending;

export const containerHasLogs = (container: Container) =>
  container.status !== ContainerStatus.Waiting;
