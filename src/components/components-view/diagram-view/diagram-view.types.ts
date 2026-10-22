import type { Edge, Node } from '@xyflow/react';
import { ComponentGroup, Container, InstanceComponent } from 'types/components.types';

interface NodeData<T> extends Record<string, unknown> {
  selected?: boolean;
  visible?: boolean;
  componentData: T;
}

interface ContainerNodeData extends NodeData<Container> {
  podName: string;
}

interface GroupNodeData extends NodeData<ComponentGroup> {
  collapsed: boolean;
}

export type ComponentNodeType = Node<NodeData<InstanceComponent>, 'componentNode'>;
export type ContainerNodeType = Node<ContainerNodeData, 'containerNode'>;
export type GroupNodeType = Node<GroupNodeData, 'groupNode'>;
export type CustomNode = ComponentNodeType | ContainerNodeType | GroupNodeType;

export type CustomEdge = Edge<{ visible?: boolean }>;
