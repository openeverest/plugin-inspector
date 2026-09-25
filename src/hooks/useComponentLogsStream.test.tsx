import * as React from 'react';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PluginApi } from '@openeverest/plugin-sdk';
import { PluginApiContext } from 'components/plugin-api-context/plugin-api.context';
import { appendCapped, useComponentLogsStream } from './useComponentLogsStream';

const TARGET = { namespace: 'db', instanceName: 'mydb' };

const streamOf = (chunks: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
};

const renderWithApi = (fetchMock: PluginApi['fetch'], enabled = true) => {
  const api: PluginApi = {
    React,
    registerExtension: vi.fn(),
    fetch: fetchMock,
    basePath: '/v1/clusters/main/plugins/plugin-inspector',
    cssNonce: '',
    hostVersion: 'dev',
    uiContractVersion: '18',
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PluginApiContext.Provider value={api}>{children}</PluginApiContext.Provider>
  );
  return renderHook(
    ({ container }: { container: string }) =>
      useComponentLogsStream(TARGET, 'mydb-0', { container, previous: false, enabled }),
    { wrapper, initialProps: { container: 'mongod' } }
  );
};

describe('appendCapped', () => {
  it('keeps only the newest lines once the cap is exceeded', () => {
    expect(appendCapped('a\nb\n', 'c\nd', 3)).toBe('b\nc\nd');
    expect(appendCapped('a\n', 'b', 3)).toBe('a\nb');
  });
});

describe('useComponentLogsStream', () => {
  it('follows the selected container and accumulates streamed chunks', async () => {
    const fetchMock = vi.fn<PluginApi['fetch']>(async () =>
      new Response(streamOf(['line 1\n', 'line 2\n']))
    );
    const { result } = renderWithApi(fetchMock);

    await waitFor(() => expect(result.current.logs).toBe('line 1\nline 2\n'));
    const url = new URL(fetchMock.mock.calls[0][0], 'http://host');
    expect(url.pathname).toBe('/api/components/mydb-0/logs');
    expect(url.searchParams.get('container')).toBe('mongod');
    expect(url.searchParams.get('follow')).toBe('true');
    expect(url.searchParams.get('instance')).toBe('mydb');
  });

  it('aborts the previous stream when the container changes', async () => {
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn<PluginApi['fetch']>(async (_path, init) => {
      if (init?.signal) {
        signals.push(init.signal);
      }
      return new Response(new ReadableStream());
    });
    const { rerender } = renderWithApi(fetchMock);
    await waitFor(() => expect(signals).toHaveLength(1));

    act(() => rerender({ container: 'backup-agent' }));

    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('surfaces backend errors', async () => {
    const fetchMock = vi.fn<PluginApi['fetch']>(async () =>
      Response.json({ error: 'pod not found in instance' }, { status: 404 })
    );
    const { result } = renderWithApi(fetchMock);

    await waitFor(() => expect(result.current.error?.message).toBe('pod not found in instance'));
  });

  it('does not fetch while disabled', () => {
    const fetchMock = vi.fn<PluginApi['fetch']>();
    renderWithApi(fetchMock, false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
