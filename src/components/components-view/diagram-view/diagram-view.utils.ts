import dagre from 'dagre';
import { Position } from '@xyflow/react';
import { InstanceComponent } from 'types/components.types';
import { InstanceService } from 'types/services.types';
import { groupComponents } from 'utils/component-groups.utils';
import {
  COMPONENT_NODE_HEIGHT,
  COMPONENT_NODE_WIDTH,
  CONTAINER_NODE_HEIGHT,
  CONTAINER_NODE_WIDTH,
  DIAGRAM_MAX_HEIGHT,
  DIAGRAM_MIN_HEIGHT,
  ENDPOINT_NOT_READY_CLASS,
  GROUP_GAP,
  GROUP_HEADER_HEIGHT,
  GROUP_NODE_ID_PREFIX,
  GROUP_PADDING,
  SERVICE_NODE_HEIGHT,
  SERVICE_NODE_ID_PREFIX,
  SERVICE_NODE_WIDTH,
} from './diagram-view.constants';
import { CustomEdge, CustomNode, GroupNodeType } from './diagram-view.types';

const MIN_GROUP_WIDTH = COMPONENT_NODE_WIDTH + 2 * GROUP_PADDING;

const nodeSize = (node: CustomNode) => {
  switch (node.type) {
    case 'containerNode':
      return { width: CONTAINER_NODE_WIDTH, height: CONTAINER_NODE_HEIGHT };
    case 'serviceNode':
      return { width: SERVICE_NODE_WIDTH, height: SERVICE_NODE_HEIGHT };
    default:
      return { width: COMPONENT_NODE_WIDTH, height: COMPONENT_NODE_HEIGHT };
  }
};

const isGroupNode = (node: CustomNode): node is GroupNodeType => node.type === 'groupNode';

export const groupNodeId = (name: string) => `${GROUP_NODE_ID_PREFIX}${name}`;

// Lays out the pods and containers of one group with dagre, from the origin.
const layoutGroupContent = (nodes: CustomNode[], edges: CustomEdge[]) => {
  if (nodes.length === 0) {
    return { children: nodes, width: 0, height: 0 };
  }
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB' });
  nodes.forEach((node) => graph.setNode(node.id, nodeSize(node)));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  // dagre anchors nodes at their center; React Flow anchors at the top-left corner.
  const boxes = nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    const { width, height } = nodeSize(node);
    return { left: x - width / 2, top: y - height / 2, right: x + width / 2, bottom: y + height / 2 };
  });
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));

  return {
    children: nodes.map(
      (node, i): CustomNode => ({
        ...node,
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        position: { x: boxes[i].left - left, y: boxes[i].top - top },
      })
    ),
    width: Math.max(...boxes.map((box) => box.right)) - left,
    height: Math.max(...boxes.map((box) => box.bottom)) - top,
  };
};

// Stacks the groups as equally wide lanes; children are positioned relative to their group.
const layout = (nodes: CustomNode[], edges: CustomEdge[]) => {
  const lanes = nodes.filter(isGroupNode).map((group) => {
    const children = nodes.filter((node) => node.parentId === group.id);
    const ids = new Set(children.map((node) => node.id));
    const content = layoutGroupContent(
      children,
      edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    );
    return { group, ...content };
  });
  const width = Math.max(MIN_GROUP_WIDTH, ...lanes.map((lane) => lane.width + 2 * GROUP_PADDING));

  let y = 0;
  return lanes.flatMap(({ group, children, height }) => {
    const groupHeight = GROUP_HEADER_HEIGHT + (children.length > 0 ? height + GROUP_PADDING : 0);
    const positioned: CustomNode[] = [
      { ...group, position: { x: 0, y }, width, height: groupHeight },
      ...children.map(
        (child): CustomNode => ({
          ...child,
          position: {
            x: child.position.x + GROUP_PADDING,
            y: child.position.y + GROUP_HEADER_HEIGHT,
          },
        })
      ),
    ];
    y += groupHeight + GROUP_GAP;
    return positioned;
  });
};

// A Service shows in each lane whose pods it selects, above those pods. React Flow
// needs every group node before its children.
export const buildGraph = (
  components: InstanceComponent[],
  services: InstanceService[],
  selectedId?: string,
  collapsedGroupIds: ReadonlySet<string> = new Set()
) => {
  const nodes: CustomNode[] = [];
  const edges: CustomEdge[] = [];
  const groups = groupComponents(components);
  const selected = selectedId ?? groups[0]?.pods[0]?.name;

  groups.forEach((group) => {
    const groupId = groupNodeId(group.name);
    nodes.push({
      id: groupId,
      type: 'groupNode',
      position: { x: 0, y: 0 },
      data: { visible: true, collapsed: collapsedGroupIds.has(groupId), componentData: group },
    });

    const podNames = new Set(group.pods.map((pod) => pod.name));
    services.forEach((service) => {
      const targets = service.pods.filter((pod) => podNames.has(pod.name));
      if (targets.length === 0) {
        return;
      }
      const serviceId = `${SERVICE_NODE_ID_PREFIX}${group.name}/${service.name}`;
      nodes.push({
        id: serviceId,
        type: 'serviceNode',
        parentId: groupId,
        position: { x: 0, y: 0 },
        data: { visible: true, componentData: service },
      });
      targets.forEach((pod) => {
        edges.push({
          id: `e-${serviceId}-${pod.name}`,
          source: serviceId,
          target: pod.name,
          type: 'smoothstep',
          className: pod.ready ? undefined : ENDPOINT_NOT_READY_CLASS,
          data: { kind: 'endpoint', visible: true },
        });
      });
    });

    group.pods.forEach((component) => {
      const isSelected = component.name === selected;
      nodes.push({
        id: component.name,
        type: 'componentNode',
        parentId: groupId,
        position: { x: 0, y: 0 },
        data: { selected: isSelected, visible: true, componentData: component },
      });

      component.containers.forEach((container) => {
        const id = `${component.name}/${container.name}`;
        nodes.push({
          id,
          type: 'containerNode',
          parentId: groupId,
          position: { x: 0, y: 0 },
          data: { visible: isSelected, podName: component.name, componentData: container },
        });
        edges.push({
          id: `e-${id}`,
          source: component.name,
          target: id,
          type: 'smoothstep',
          data: { kind: 'container', visible: isSelected },
        });
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
      const isChild = node.data.podName === id;
      node.data.visible = isChild && !node.data.visible;
    }
    if (node.type === 'componentNode') {
      node.data.selected = node.id === id;
    }
  });
  edges.forEach((edge) => {
    if (edge.data?.kind !== 'container') {
      return;
    }
    const childVisible = nodes.some(
      (node) => node.id === edge.target && node.data.visible
    );
    edge.data = { kind: 'container', visible: edge.source === id && childVisible };
  });
};

// Collapses or expands a group; mutates the graph in place and returns the new state.
export const toggleGroup = (nodes: CustomNode[], id: string) => {
  const group = nodes.filter(isGroupNode).find((node) => node.id === id);
  if (!group) {
    return false;
  }
  group.data.collapsed = !group.data.collapsed;
  return group.data.collapsed;
};

export const visibleGraph = (nodes: CustomNode[], edges: CustomEdge[]) => {
  const collapsedIds = new Set(
    nodes.filter((node) => isGroupNode(node) && node.data.collapsed).map((node) => node.id)
  );
  const visibleNodes = nodes.filter(
    (node) => isGroupNode(node) || (node.data.visible && !collapsedIds.has(node.parentId ?? ''))
  );
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter(
    (edge) => edge.data?.visible && visibleIds.has(edge.source) && visibleIds.has(edge.target)
  );
  return { nodes: layout(visibleNodes, visibleEdges), edges: visibleEdges };
};

// Grows the canvas with the stacked lanes so pods stay legible, within bounds.
export const diagramHeight = (nodes: CustomNode[]) => {
  const bottom = Math.max(
    0,
    ...nodes.filter(isGroupNode).map((node) => node.position.y + (node.height ?? 0))
  );
  return Math.min(DIAGRAM_MAX_HEIGHT, Math.max(DIAGRAM_MIN_HEIGHT, bottom + 2 * GROUP_GAP));
};
