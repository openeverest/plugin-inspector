import { describe, expect, it } from 'vitest';
import {
  ComponentStatus,
  ContainerStatus,
  InstanceComponent,
} from 'types/components.types';
import { buildGraph, toggleNode, visibleGraph } from './diagram-view.utils';

const pod = (name: string, containers: string[]): InstanceComponent => ({
  name,
  type: 'engine',
  status: ComponentStatus.Running,
  restarts: 0,
  ready: '1/1',
  containers: containers.map((c) => ({
    name: c,
    ready: true,
    restarts: 0,
    status: ContainerStatus.Running,
  })),
});

const components = [pod('db-0', ['mongod']), pod('db-1', ['mongod', 'agent'])];

const visibleIds = (graph: ReturnType<typeof buildGraph>) =>
  visibleGraph(graph.nodes, graph.edges).nodes.map((n) => n.id);

describe('diagram graph', () => {
  it('expands the first pod by default', () => {
    expect(visibleIds(buildGraph(components))).toEqual(['db-0', 'db-0/mongod', 'db-1']);
  });

  it('keeps the selected pod expanded across rebuilds', () => {
    expect(visibleIds(buildGraph(components, 'db-1'))).toEqual([
      'db-0',
      'db-1',
      'db-1/mongod',
      'db-1/agent',
    ]);
  });

  it('switches expansion to the clicked pod and collapses it on a second click', () => {
    const graph = buildGraph(components);

    toggleNode(graph.nodes, graph.edges, 'db-1');
    expect(visibleIds(graph)).toEqual(['db-0', 'db-1', 'db-1/mongod', 'db-1/agent']);
    expect(visibleGraph(graph.nodes, graph.edges).edges).toHaveLength(2);

    toggleNode(graph.nodes, graph.edges, 'db-1');
    expect(visibleIds(graph)).toEqual(['db-0', 'db-1']);
    expect(visibleGraph(graph.nodes, graph.edges).edges).toHaveLength(0);
  });
});
