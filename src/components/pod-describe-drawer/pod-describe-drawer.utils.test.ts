import { describe, expect, it } from 'vitest';
import { formatResources, formatState } from './pod-describe-drawer.utils';

describe('formatState', () => {
  it('includes the reason and exit code of a terminated container', () => {
    expect(formatState({ status: 'Terminated', reason: 'OOMKilled', exitCode: 137 })).toBe(
      'Terminated: OOMKilled, exit code 137'
    );
  });

  it('keeps exit code 0 and omits missing details', () => {
    expect(formatState({ status: 'Terminated', exitCode: 0 })).toBe('Terminated: exit code 0');
    expect(formatState({ status: 'Running' })).toBe('Running');
  });
});

describe('formatResources', () => {
  it('lists resources in a stable order', () => {
    expect(formatResources({ memory: '1Gi', cpu: '500m' })).toBe('cpu=500m, memory=1Gi');
  });
});
