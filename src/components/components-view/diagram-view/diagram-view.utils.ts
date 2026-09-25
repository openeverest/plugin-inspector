import dagre from 'dagre';
import { Position } from '@xyflow/react';
import { InstanceComponent } from 'types/components.types';
import {
  COMPONENT_NODE_HEIGHT,
  COMPONENT_NODE_WIDTH,
  CONTAINER_NODE_HEIGHT,
  CONTAINER_NODE_WIDTH,
} from './diagram-view.constants';
import { CustomEdge, CustomNode } from './diagram-view.types';

const nodeSize = (node: CustomNode) =>
  node.type === 'componentNode'
    ? { width: COMPONENT_NODE_WIDTH, height: COMPONENT_NODE_HEIGHT }
    : { width: CONTAINER_NODE_WIDTH, height: CONTAINER_NODE_HEIGHT };

const layout = (nodes: CustomNode[], edges: CustomEdge[]) => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB' });
  nodes.forEach((node) => graph.setNode(node.id, nodeSize(node)));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  return nodes.map((node): CustomNode => {
    const { x, y } = graph.node(node.id);
    const { width, height } = nodeSize(node);
    // dagre anchors nodes at their center; React Flow anchors at the top-left corner.
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: { x: x - width / 2, y: y - height / 2 },
    };
  });
};

export const buildGraph = (
  components: InstanceComponent[],
  selectedId?: string
) => {
  const nodes: CustomNode[] = [];
  const edges: CustomEdge[] = [];
  const selected = selectedId ?? components[0]?.name;

  components.forEach((component) => {
    const isSelected = component.name === selected;
    nodes.push({
      id: component.name,
      type: 'componentNode',
      position: { x: 0, y: 0 },
      data: { selected: isSelected, visible: true, componentData: component },
    });

    component.containers.forEach((container) => {
      const id = `${component.name}/${container.name}`;
      nodes.push({
        id,
        type: 'containerNode',
        position: { x: 0, y: 0 },
        data: {
          visible: isSelected,
          parentId: component.name,
          componentData: container,
        },
      });
      edges.push({
        id: `e-${id}`,
        source: component.name,
        target: id,
        type: 'smoothstep',
        data: { visible: isSelected },
      });
    });
  });

  return { nodes, edges };
};

// Toggles the containers of the clicked pod; mutates the graph in place.
export const toggleNode = (
  nodes: CustomNode[],
  edges: CustomEdge[],
  id: string
) => {
  nodes.forEach((node) => {
    if (node.type === 'containerNode') {
      const isChild = node.data.parentId === id;
      node.data.visible = isChild && !node.data.visible;
    }
    node.data.selected = node.id === id;
  });
  edges.forEach((edge) => {
    const childVisible = nodes.some(
      (node) => node.id === edge.target && node.data.visible
    );
    edge.data = { visible: edge.source === id && childVisible };
  });
};

export const visibleGraph = (nodes: CustomNode[], edges: CustomEdge[]) => {
  const visibleNodes = nodes.filter((node) => node.data.visible);
  const visibleEdges = edges.filter((edge) => edge.data?.visible);
  return { nodes: layout(visibleNodes, visibleEdges), edges: visibleEdges };
};
