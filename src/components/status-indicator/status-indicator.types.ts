export type BaseStatus = 'success' | 'error' | 'pending' | 'paused' | 'unknown';

export interface StatusIndicatorProps {
  status: BaseStatus;
  label: string;
  /** Why it's in this state, e.g. CrashLoopBackOff; shown under the label. */
  reason?: string;
}
