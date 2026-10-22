import { useQuery } from '@tanstack/react-query';
import { getInstanceServices, InstanceTarget } from 'api/inspector-api';
import { usePluginApi } from 'components/plugin-api-context/plugin-api.context';
import { REFETCH_INTERVAL_MS } from './useInstanceComponents';

export const useInstanceServices = (target: InstanceTarget) => {
  const api = usePluginApi();
  return useQuery({
    queryKey: ['instance-services', target.namespace, target.instanceName],
    queryFn: () => getInstanceServices(api.fetch, target),
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
