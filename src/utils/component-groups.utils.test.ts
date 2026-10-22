import { describe, expect, it } from 'vitest';
import { ComponentStatus, InstanceComponent } from 'types/components.types';
import { groupComponents, summarizeGroup } from './component-groups.utils';

const pod = (
  name: string,
  component?: string,
  overrides: Partial<InstanceComponent> = {}
): InstanceComponent => ({
  name,
  component,
  status: ComponentStatus.Running,
  restarts: 0,
  ready: '1/1',
  containers: [],
  ...overrides,
});

describe('groupComponents', () => {
  it('groups pods by component, sorted by name, with pods of no component last', () => {
    const groups = groupComponents([
      pod('stray-0'),
      pod('db-rs0-0', 'engine'),
      pod('db-mongos-0', 'proxy'),
      pod('db-cfg-0', 'configServer'),
      pod('db-rs0-1', 'engine'),
    ]);

    expect(groups.map((g) => [g.name, g.pods.map((p) => p.name)])).toEqual([
      ['configServer', ['db-cfg-0']],
      ['engine', ['db-rs0-0', 'db-rs0-1']],
      ['proxy', ['db-mongos-0']],
      ['', ['stray-0']],
    ]);
  });
});

describe('summarizeGroup', () => {
  it('counts ready pods and reports the most severe status', () => {
    const summary = summarizeGroup({
      name: 'engine',
      pods: [
        pod('a', 'engine'),
        pod('b', 'engine', { ready: '0/1' }),
        pod('c', 'engine', { status: ComponentStatus.Failed }),
      ],
    });

    expect(summary).toEqual({ status: 'error', ready: 1, total: 3 });
  });

  it('reports a fully ready group as healthy', () => {
    expect(summarizeGroup({ name: 'proxy', pods: [pod('a'), pod('b')] }).status).toBe('success');
  });
});
