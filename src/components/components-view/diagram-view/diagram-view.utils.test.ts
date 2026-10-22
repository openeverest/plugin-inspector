import { describe, expect, it } from 'vitest';
import {
  ComponentStatus,
  ContainerStatus,
  InstanceComponent,
} from 'types/components.types';
import { GROUP_HEADER_HEIGHT, GROUP_PADDING } from './diagram-view.constants';
import { buildGraph, groupNodeId, toggleGroup, toggleNode, visibleGraph } from './diagram-view.utils';

const pod = (name: string, containers: string[], component = 'engine'): InstanceComponent => ({
  name,
  component,
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

const engine = groupNodeId('engine');
const proxy = groupNodeId('proxy');
const components = [pod('db-0', ['mongod']), pod('db-1', ['mongod', 'agent'])];

const visible = (graph: ReturnType<typeof buildGraph>) =>
  visibleGraph(graph.nodes, graph.edges).nodes;

const visibleIds = (graph: ReturnType<typeof buildGraph>) => visible(graph).map((n) => n.id);

describe('diagram graph', () => {
  it('frames the pods of a component and expands the first pod by default', () => {
    expect(visibleIds(buildGraph(components))).toEqual([engine, 'db-0', 'db-0/mongod', 'db-1']);
  });

  it('keeps the selected pod expanded across rebuilds', () => {
    expect(visibleIds(buildGraph(components, 'db-1'))).toEqual([
      engine,
      'db-0',
      'db-1',
      'db-1/mongod',
      'db-1/agent',
    ]);
  });

  it('switches expansion to the clicked pod and collapses it on a second click', () => {
    const graph = buildGraph(components);

    toggleNode(graph.nodes, graph.edges, 'db-1');
    expect(visibleIds(graph)).toEqual([engine, 'db-0', 'db-1', 'db-1/mongod', 'db-1/agent']);
    expect(visibleGraph(graph.nodes, graph.edges).edges).toHaveLength(2);

    toggleNode(graph.nodes, graph.edges, 'db-1');
    expect(visibleIds(graph)).toEqual([engine, 'db-0', 'db-1']);
    expect(visibleGraph(graph.nodes, graph.edges).edges).toHaveLength(0);
  });

  it('stacks the groups as equally wide lanes and keeps pods inside their frame', () => {
    const graph = buildGraph([...components, pod('db-mongos-0', [], 'proxy')], 'none');
    const nodes = visible(graph);
    const byId = (id: string) => nodes.find((n) => n.id === id);

    const engineFrame = byId(engine);
    const proxyFrame = byId(proxy);
    expect(engineFrame?.position).toEqual({ x: 0, y: 0 });
    expect(proxyFrame?.width).toBe(engineFrame?.width);
    expect(proxyFrame?.position.y).toBeGreaterThan(engineFrame?.height ?? Infinity);

    expect(byId('db-mongos-0')?.parentId).toBe(proxy);
    expect(byId('db-0')?.position).toEqual({ x: GROUP_PADDING, y: GROUP_HEADER_HEIGHT });
  });

  it('hides a collapsed group\'s pods and shrinks its frame to the header', () => {
    const graph = buildGraph([...components, pod('db-mongos-0', [], 'proxy')]);

    expect(toggleGroup(graph.nodes, engine)).toBe(true);
    const nodes = visible(graph);
    expect(nodes.map((n) => n.id)).toEqual([engine, proxy, 'db-mongos-0']);
    expect(nodes[0].height).toBe(GROUP_HEADER_HEIGHT);
    expect(visibleGraph(graph.nodes, graph.edges).edges).toHaveLength(0);

    expect(toggleGroup(graph.nodes, engine)).toBe(false);
    expect(visibleIds(graph)).toContain('db-0/mongod');
  });

  it('keeps a group collapsed across rebuilds', () => {
    expect(visibleIds(buildGraph(components, undefined, new Set([engine])))).toEqual([engine]);
  });
});
