import { describe, expect, it } from 'vitest';
import {
  ComponentStatus,
  ContainerStatus,
  InstanceComponent,
} from 'types/components.types';
import { componentBaseStatus, containerBaseStatus } from 'utils/component-status.utils';
import { sortComponents } from './table-view.utils';

const component = (
  name: string,
  status: ComponentStatus,
  overrides: Partial<InstanceComponent> = {}
): InstanceComponent => ({
  name,
  status,
  type: 'engine',
  restarts: 0,
  ready: '1/1',
  containers: [],
  ...overrides,
});

describe('sortComponents', () => {
  const components = [
    component('b-0', ComponentStatus.Running),
    component('c-0', ComponentStatus.Pending),
    component('a-0', ComponentStatus.Running),
  ];

  it('puts pending pods first when sorting status descending, ties by name', () => {
    expect(sortComponents(components, 'status', 'desc').map((c) => c.name)).toEqual([
      'c-0',
      'a-0',
      'b-0',
    ]);
  });

  it('sorts numerically by restarts', () => {
    const withRestarts = [
      component('a-0', ComponentStatus.Running, { restarts: 10 }),
      component('b-0', ComponentStatus.Running, { restarts: 2 }),
    ];
    expect(sortComponents(withRestarts, 'restarts', 'asc').map((c) => c.name)).toEqual([
      'b-0',
      'a-0',
    ]);
  });

  it('treats a missing node as empty instead of throwing', () => {
    const mixed = [
      component('a-0', ComponentStatus.Running, { nodeName: 'node-b' }),
      component('b-0', ComponentStatus.Pending),
    ];
    expect(sortComponents(mixed, 'nodeName', 'asc').map((c) => c.name)).toEqual([
      'b-0',
      'a-0',
    ]);
  });
});

describe('status mapping', () => {
  it('reports a running pod as pending until all containers are ready', () => {
    expect(componentBaseStatus({ status: ComponentStatus.Running, ready: '1/2' })).toBe('pending');
    expect(componentBaseStatus({ status: ComponentStatus.Running, ready: '2/2' })).toBe('success');
  });

  it('reports a running but unready container as pending', () => {
    expect(containerBaseStatus({ status: ContainerStatus.Running, ready: false })).toBe('pending');
    expect(containerBaseStatus({ status: ContainerStatus.Running, ready: true })).toBe('success');
  });
});
