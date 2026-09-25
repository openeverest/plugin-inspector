import { Messages } from '../components-view.messages';
import { SortKey } from './table-view.types';

interface ColumnDefinition {
  label: string;
  sortKey?: SortKey;
}

// Leading expand-toggle column and trailing actions column are rendered separately.
export const TABLE_COLUMNS: ColumnDefinition[] = [
  { label: Messages.columns.status, sortKey: 'status' },
  { label: Messages.columns.ready },
  { label: Messages.columns.name, sortKey: 'name' },
  { label: Messages.columns.type, sortKey: 'type' },
  { label: Messages.columns.node, sortKey: 'nodeName' },
  { label: Messages.columns.age },
  { label: Messages.columns.restarts, sortKey: 'restarts' },
];

export const TABLE_COLUMN_COUNT = TABLE_COLUMNS.length + 2;
