import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import xyflowStyles from '@xyflow/react/dist/style.css?inline';
import type { PluginApi } from '@openeverest/plugin-sdk';
import { PluginThemeProvider } from '@openeverest/ui-lib';
import { PluginApiContext } from 'components/plugin-api-context/plugin-api.context';

// Must be unique across plugins so Emotion caches never collide.
const EMOTION_CACHE_KEY = 'plugin-inspector';

interface PluginRootProps {
  api: PluginApi;
  queryClient: QueryClient;
  children: ReactNode;
}

export const PluginRoot = ({ api, queryClient, children }: PluginRootProps) => (
  <PluginApiContext.Provider value={api}>
    <QueryClientProvider client={queryClient}>
      <PluginThemeProvider cacheKey={EMOTION_CACHE_KEY} nonce={api.cssNonce}>
        {/* Library builds don't emit CSS the host would load, so inline it under the CSP nonce. */}
        <style nonce={api.cssNonce}>{xyflowStyles}</style>
        {children}
      </PluginThemeProvider>
    </QueryClientProvider>
  </PluginApiContext.Provider>
);
