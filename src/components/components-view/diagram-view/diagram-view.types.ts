import type { Edge, Node } from '@xyflow/react';
import { ComponentGroup, Container, InstanceComponent } from 'types/components.types';
import { InstanceService } from 'types/services.types';

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
export type ServiceNodeType = Node<NodeData<InstanceService>, 'serviceNode'>;
export type CustomNode = ComponentNodeType | ContainerNodeType | GroupNodeType | ServiceNodeType;

/** Pod → container edges toggle with the pod; service → pod endpoint edges always show. */
export type CustomEdge = Edge<{ kind: 'container' | 'endpoint'; visible: boolean }>;
