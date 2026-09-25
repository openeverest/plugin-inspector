export enum ComponentStatus {
  Pending = 'Pending',
  Running = 'Running',
  Succeeded = 'Succeeded',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export enum ContainerStatus {
  Running = 'Running',
  Waiting = 'Waiting',
  Terminated = 'Terminated',
}

export interface Container {
  name: string;
  started?: string;
  ready: boolean;
  restarts: number;
  status: ContainerStatus;
  /** Waiting/termination reason, e.g. CrashLoopBackOff or OOMKilled. */
  reason?: string;
}

/** A pod backing the instance, as returned by the plugin backend. */
export interface InstanceComponent {
  name: string;
  type: string;
  status: ComponentStatus;
  /** Why the pod is stuck, e.g. Unschedulable or ImagePullBackOff. */
  reason?: string;
  nodeName?: string;
  started?: string;
  restarts: number;
  /** Ready containers over total, e.g. "2/3". */
  ready: string;
  containers: Container[];
}

export interface LogsSelection {
  pod: string;
  container?: string;
}
