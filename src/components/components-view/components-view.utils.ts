import { InstanceComponent } from 'types/components.types';

export const filterComponents = (components: InstanceComponent[], query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return components;
  }
  return components.filter((component) =>
    [component.name, component.type, component.status, component.nodeName].some(
      (value) => value?.toLowerCase().includes(needle)
    )
  );
};
