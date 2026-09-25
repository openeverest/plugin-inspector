import { formatDistanceToNowStrict, isValid } from 'date-fns';
import { ContainerState } from 'types/describe.types';
import { Messages } from './pod-describe-drawer.messages';

export const timeAgo = (value?: string) => {
  const date = value ? new Date(value) : null;
  return date && isValid(date)
    ? formatDistanceToNowStrict(date, { addSuffix: true })
    : Messages.none;
};

// "cpu=500m, memory=1Gi" in a stable order.
export const formatResources = (resources?: Record<string, string>) => {
  const entries = Object.entries(resources ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return entries.length
    ? entries.map(([name, value]) => `${name}=${value}`).join(', ')
    : Messages.none;
};

// One line like kubectl's: "Terminated: OOMKilled (exit code 137)".
export const formatState = ({ status, reason, exitCode }: ContainerState) => {
  const detail = [reason, exitCode !== undefined ? Messages.container.exitCode(exitCode) : '']
    .filter(Boolean)
    .join(', ');
  return detail ? `${status}: ${detail}` : status;
};
