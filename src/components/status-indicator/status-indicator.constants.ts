import { BaseStatus } from './status-indicator.types';

export const BASE_STATUS_COLOR: Record<BaseStatus, string> = {
  success: 'success.main',
  error: 'error.main',
  pending: 'warning.main',
  paused: 'text.disabled',
  unknown: 'text.secondary',
};
