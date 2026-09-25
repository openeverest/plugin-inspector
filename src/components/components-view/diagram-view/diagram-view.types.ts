import type { Edge, Node } from '@xyflow/react';
import { Container, InstanceComponent } from 'types/components.types';

interface NodeData<T> extends Record<string, unknown> {
  selected?: boolean;
  visible?: boolean;
  parentId?: string;
  componentData: T;
}

export type ComponentNodeType = Node<NodeData<InstanceComponent>, 'componentNode'>;
export type ContainerNodeType = Node<NodeData<Container>, 'containerNode'>;
export type CustomNode = ComponentNodeType | ContainerNodeType;

export type CustomEdge = Edge<{ visible?: boolean }>;
