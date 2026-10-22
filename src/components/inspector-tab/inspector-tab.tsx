import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import { ComponentsView } from 'components/components-view/components-view';
import { InspectorContext } from 'components/inspector-context/inspector.context';
import { LogsPanel } from 'components/logs-panel/logs-panel';
import { PodDescribeDrawer } from 'components/pod-describe-drawer/pod-describe-drawer';
import { useInstanceComponents } from 'hooks/useInstanceComponents';
import { useInstanceServices } from 'hooks/useInstanceServices';
import { LogsSelection } from 'types/components.types';
import { InstanceService } from 'types/services.types';
import { Messages } from './inspector-tab.messages';

// Stable while services are loading or failed, so the diagram isn't rebuilt on every render.
const NO_SERVICES: InstanceService[] = [];

interface InspectorTabProps {
  namespace: string;
  instanceName: string;
}

export const InspectorTab = ({ namespace, instanceName }: InspectorTabProps) => {
  const target = useMemo(() => ({ namespace, instanceName }), [namespace, instanceName]);
  const { data: components = [], isLoading, error } = useInstanceComponents(target);
  // Services are supplementary, so failing to load them doesn't hide the pods.
  const { data: services = NO_SERVICES, error: servicesError } = useInstanceServices(target);
  const [selection, setSelection] = useState<LogsSelection | null>(null);
  // Lives here so it survives the logs panel remounting on pod/container change.
  const [logFilter, setLogFilter] = useState('');
  const [describedPod, setDescribedPod] = useState<string | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const inspectorContext = useMemo(
    () => ({
      viewLogs: (pod: string, container?: string) => setSelection({ pod, container }),
      describePod: setDescribedPod,
    }),
    []
  );

  useEffect(() => {
    if (selection) {
      logsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selection]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <InspectorContext.Provider value={inspectorContext}>
      <Stack sx={{ gap: 2, mt: 2 }}>
        {error && <Alert severity="error">{Messages.loadFailed(error.message)}</Alert>}
        {!error && components.length === 0 && (
          <Alert severity="info">{Messages.noComponents}</Alert>
        )}
        {servicesError && (
          <Alert severity="warning">{Messages.servicesLoadFailed(servicesError.message)}</Alert>
        )}
        {components.length > 0 && <ComponentsView components={components} services={services} />}
        {selection && (
          <Box ref={logsRef}>
            <LogsPanel
              key={`${selection.pod}/${selection.container ?? ''}`}
              target={target}
              components={components}
              selection={selection}
              onSelectionChange={setSelection}
              filter={logFilter}
              onFilterChange={setLogFilter}
              onClose={() => setSelection(null)}
            />
          </Box>
        )}
      </Stack>
      <PodDescribeDrawer
        target={target}
        pod={describedPod}
        onClose={() => setDescribedPod(null)}
      />
    </InspectorContext.Provider>
  );
};
