import { useQuery } from '@tanstack/react-query';
import { getPodDescription, InstanceTarget } from 'api/inspector-api';
import { usePluginApi } from 'components/plugin-api-context/plugin-api.context';

const REFETCH_INTERVAL_MS = 5000;

export const usePodDescription = (target: InstanceTarget, pod: string | null) => {
  const api = usePluginApi();
  return useQuery({
    queryKey: ['pod-description', target.namespace, target.instanceName, pod],
    queryFn: () => getPodDescription(api.fetch, target, pod ?? ''),
    enabled: pod !== null,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
