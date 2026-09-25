import { InstanceComponent } from 'types/components.types';
import { COMPONENT_STATUS_WEIGHT } from 'utils/component-status.utils';
import { SortKey, SortOrder } from './table-view.types';

const compareBy = (key: SortKey, a: InstanceComponent, b: InstanceComponent) => {
  switch (key) {
    case 'status':
      return COMPONENT_STATUS_WEIGHT[a.status] - COMPONENT_STATUS_WEIGHT[b.status];
    case 'restarts':
      return a.restarts - b.restarts;
    default:
      return (a[key] ?? '').localeCompare(b[key] ?? '');
  }
};

// Ties fall back to name so rows don't jump around between polls.
export const sortComponents = (
  components: InstanceComponent[],
  key: SortKey,
  order: SortOrder
) => {
  const direction = order === 'asc' ? 1 : -1;
  return [...components].sort(
    (a, b) => direction * compareBy(key, a, b) || a.name.localeCompare(b.name)
  );
};
