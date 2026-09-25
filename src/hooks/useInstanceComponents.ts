import { useQuery } from '@tanstack/react-query';
import { getInstanceComponents, InstanceTarget } from 'api/inspector-api';
import { usePluginApi } from 'components/plugin-api-context/plugin-api.context';

const REFETCH_INTERVAL_MS = 5000;

export const useInstanceComponents = (target: InstanceTarget) => {
  const api = usePluginApi();
  return useQuery({
    queryKey: ['instance-components', target.namespace, target.instanceName],
    queryFn: () => getInstanceComponents(api.fetch, target),
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
