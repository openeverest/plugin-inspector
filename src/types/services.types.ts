export interface ServicePort {
  name?: string;
  protocol: string;
  port: number;
  /** Omitted when it equals the port. */
  targetPort?: string;
  nodePort?: number;
}

/** An instance pod the Service selects, and whether it is a ready endpoint. */
export interface ServicePod {
  name: string;
  ready: boolean;
}

/** A Service selecting the instance's pods, as returned by the plugin backend. */
export interface InstanceService {
  name: string;
  /** ClusterIP, NodePort or LoadBalancer. */
  type: string;
  /** Empty for headless Services. */
  clusterIP?: string;
  headless: boolean;
  externalAddresses: string[];
  ports: ServicePort[];
  pods: ServicePod[];
}
