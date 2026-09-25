import { Container, ContainerStatus } from 'types/components.types';
import { containerHasLogs } from 'utils/component-status.utils';

// A container that restarted still has logs from its previous run even while waiting.
export const hasAnyLogs = (container: Container) =>
  containerHasLogs(container) || container.restarts > 0;

// A waiting container has no current logs, so only the previous run can be shown.
export const mustShowPrevious = (container: Container) =>
  container.status === ContainerStatus.Waiting;

export interface FilteredLogs {
  text: string;
  matched: number;
  total: number;
}

// Case-insensitive substring match per line; an empty query keeps everything.
export const filterLogLines = (logs: string, query: string): FilteredLogs => {
  const lines = logs.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return { text: logs, matched: lines.length, total: lines.length };
  }
  const matching = lines.filter((line) => line.toLowerCase().includes(needle));
  return { text: matching.join('\n'), matched: matching.length, total: lines.length };
};

export const downloadText = (text: string, fileName: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
