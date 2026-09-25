import { useCallback, useEffect, useState } from 'react';
import { getComponentLogs, InstanceTarget } from 'api/inspector-api';
import { usePluginApi } from 'components/plugin-api-context/plugin-api.context';

export const MAX_LOG_LINES = 10000;

interface ComponentLogsStreamOptions {
  container?: string;
  previous: boolean;
  enabled: boolean;
}

export const appendCapped = (prev: string, chunk: string, maxLines: number) => {
  const next = prev + chunk;
  const lines = next.split('\n');
  return lines.length > maxLines ? lines.slice(-maxLines).join('\n') : next;
};

export const useComponentLogsStream = (
  target: InstanceTarget,
  pod: string,
  { container, previous, enabled }: ComponentLogsStreamOptions
) => {
  const api = usePluginApi();
  const [logs, setLogs] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { namespace, instanceName } = target;

  useEffect(() => {
    setLogs('');
    setError(null);
    if (!enabled || !pod) {
      setIsConnecting(false);
      return;
    }

    const abortController = new AbortController();
    setIsConnecting(true);

    const stream = async () => {
      try {
        const response = await getComponentLogs(
          api.fetch,
          { namespace, instanceName },
          pod,
          {
            container,
            // Logs of a previous (terminated) container are complete; nothing to follow.
            follow: !previous,
            previous,
            tailLines: MAX_LOG_LINES,
            signal: abortController.signal,
          }
        );
        setIsConnecting(false);

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }
        const decoder = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done || abortController.signal.aborted) {
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          setLogs((prev) => appendCapped(prev, chunk, MAX_LOG_LINES));
        }
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsConnecting(false);
      }
    };

    stream();
    return () => abortController.abort();
  }, [api, namespace, instanceName, pod, container, previous, enabled]);

  const getFullLogs = useCallback(async () => {
    const response = await getComponentLogs(
      api.fetch,
      { namespace, instanceName },
      pod,
      { container, follow: false, previous, tailLines: MAX_LOG_LINES }
    );
    return response.text();
  }, [api, namespace, instanceName, pod, container, previous]);

  return { logs, isConnecting, error, getFullLogs };
};
