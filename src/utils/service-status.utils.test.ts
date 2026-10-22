import { describe, expect, it } from 'vitest';
import { InstanceService } from 'types/services.types';
import { formatServicePorts, serviceBaseStatus } from './service-status.utils';

const service = (overrides: Partial<InstanceService> = {}): InstanceService => ({
  name: 'db-mongos',
  type: 'ClusterIP',
  headless: false,
  externalAddresses: [],
  ports: [],
  pods: [
    { name: 'a', ready: true },
    { name: 'b', ready: true },
  ],
  ...overrides,
});

describe('serviceBaseStatus', () => {
  it('is healthy when every selected pod is a ready endpoint', () => {
    expect(serviceBaseStatus(service())).toBe('success');
  });

  it('is degraded while some endpoints are not ready', () => {
    expect(serviceBaseStatus(service({ pods: [{ name: 'a', ready: true }, { name: 'b', ready: false }] }))).toBe('pending');
  });

  it('is unreachable with no ready endpoint', () => {
    expect(serviceBaseStatus(service({ pods: [{ name: 'a', ready: false }] }))).toBe('error');
  });

  it('is degraded while a load balancer waits for an address', () => {
    expect(serviceBaseStatus(service({ type: 'LoadBalancer' }))).toBe('pending');
    expect(serviceBaseStatus(service({ type: 'LoadBalancer', externalAddresses: ['1.2.3.4'] }))).toBe('success');
  });
});

describe('formatServicePorts', () => {
  it('uses kubectl notation, including node ports', () => {
    expect(
      formatServicePorts([
        { port: 27017, protocol: 'TCP' },
        { port: 443, nodePort: 31443, protocol: 'TCP' },
      ])
    ).toBe('27017/TCP, 443:31443/TCP');
  });
});
