import type { PluginApi } from '@openeverest/plugin-sdk';
import { InstanceComponent } from 'types/components.types';

type PluginFetch = PluginApi['fetch'];

export interface InstanceTarget {
  namespace: string;
  instanceName: string;
}

export interface ComponentLogsOptions {
  container?: string;
  follow: boolean;
  previous: boolean;
  tailLines: number;
  signal?: AbortSignal;
}

const instanceParams = ({ namespace, instanceName }: InstanceTarget) =>
  new URLSearchParams({ namespace, instance: instanceName });

const errorFromResponse = async (response: Response) => {
  const body = await response.json().catch(() => null);
  const message =
    body && typeof body.error === 'string'
      ? body.error
      : `HTTP ${response.status}`;
  return new Error(message);
};

export const getInstanceComponents = async (
  pluginFetch: PluginFetch,
  target: InstanceTarget
): Promise<InstanceComponent[]> => {
  const response = await pluginFetch(
    `/api/components?${instanceParams(target)}`
  );
  if (!response.ok) {
    throw await errorFromResponse(response);
  }
  return response.json();
};

// Returns the raw response so callers can read the body as a stream.
export const getComponentLogs = async (
  pluginFetch: PluginFetch,
  target: InstanceTarget,
  pod: string,
  { container, follow, previous, tailLines, signal }: ComponentLogsOptions
): Promise<Response> => {
  const params = instanceParams(target);
  if (container) {
    params.set('container', container);
  }
  params.set('follow', String(follow));
  params.set('previous', String(previous));
  params.set('tailLines', String(tailLines));

  const response = await pluginFetch(
    `/api/components/${encodeURIComponent(pod)}/logs?${params}`,
    { signal }
  );
  if (!response.ok) {
    throw await errorFromResponse(response);
  }
  return response;
};
