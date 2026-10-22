import { BaseStatus } from 'components/status-indicator/status-indicator.types';
import { ComponentGroup, InstanceComponent } from 'types/components.types';
import { componentBaseStatus } from './component-status.utils';

// The most severe pod status wins, so a group surfaces any pod needing attention.
const STATUS_SEVERITY: Record<BaseStatus, number> = {
  error: 4,
  pending: 3,
  unknown: 2,
  paused: 1,
  success: 0,
};

// Groups keep the pods' order; named groups sort by name, pods of no component go last.
export const groupComponents = (components: InstanceComponent[]): ComponentGroup[] => {
  const groups = new Map<string, InstanceComponent[]>();
  components.forEach((component) => {
    const name = component.component ?? '';
    groups.set(name, [...(groups.get(name) ?? []), component]);
  });
  return [...groups.entries()]
    .map(([name, pods]) => ({ name, pods }))
    .sort((a, b) => Number(!a.name) - Number(!b.name) || a.name.localeCompare(b.name));
};

export const summarizeGroup = ({ pods }: ComponentGroup) => {
  const statuses = pods.map(componentBaseStatus);
  return {
    status: statuses.reduce<BaseStatus>(
      (worst, status) => (STATUS_SEVERITY[status] > STATUS_SEVERITY[worst] ? status : worst),
      'success'
    ),
    ready: statuses.filter((status) => status === 'success').length,
    total: pods.length,
  };
};
