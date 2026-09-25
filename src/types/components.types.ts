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
}

/** A pod backing the instance, as returned by the plugin backend. */
export interface InstanceComponent {
  name: string;
  type: string;
  status: ComponentStatus;
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
