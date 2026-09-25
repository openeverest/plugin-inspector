import { QueryClient } from '@tanstack/react-query';
import type {
  ClusterDetailTabProps,
  PluginRegisterFn,
} from '@openeverest/plugin-sdk';
import { InspectorTab } from 'components/inspector-tab/inspector-tab';
import { Messages } from 'components/inspector-tab/inspector-tab.messages';
import { PluginRoot } from 'components/plugin-root/plugin-root';

const TAB_PATH = 'inspector';

const register: PluginRegisterFn = (api) => {
  const queryClient = new QueryClient();

  const InspectorTabExtension = ({ namespace, instanceName }: ClusterDetailTabProps) => (
    <PluginRoot api={api} queryClient={queryClient}>
      <InspectorTab namespace={namespace} instanceName={instanceName} />
    </PluginRoot>
  );

  api.registerExtension({
    type: 'clusterDetailTab',
    label: Messages.tabLabel,
    path: TAB_PATH,
    component: InspectorTabExtension,
  });
};

export default register;
