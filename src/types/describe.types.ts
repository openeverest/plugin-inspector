export interface PodCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface ContainerState {
  status: string;
  reason?: string;
  message?: string;
  exitCode?: number;
  started?: string;
  finished?: string;
}

export interface ContainerDescription {
  name: string;
  image: string;
  ready: boolean;
  restarts: number;
  state: ContainerState;
  lastTermination?: ContainerState;
  requests?: Record<string, string>;
  limits?: Record<string, string>;
}

export interface PodEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  count: number;
  firstSeen?: string;
  lastSeen?: string;
  source?: string;
}

/** Curated `kubectl describe pod`; the raw spec is intentionally not exposed. */
export interface PodDescription {
  name: string;
  namespace: string;
  phase: string;
  reason?: string;
  message?: string;
  nodeName?: string;
  podIP?: string;
  qosClass?: string;
  started?: string;
  conditions: PodCondition[];
  initContainers: ContainerDescription[];
  containers: ContainerDescription[];
  events: PodEvent[];
}
