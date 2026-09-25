export type BaseStatus = 'success' | 'error' | 'pending' | 'paused' | 'unknown';

export interface StatusIndicatorProps {
  status: BaseStatus;
  label: string;
}
