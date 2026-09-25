import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@openeverest/ui-lib';
import { InstanceComponent } from 'types/components.types';
import { Messages } from '../components-view.messages';
import { ComponentRow } from './component-row/component-row';
import { TABLE_COLUMN_COUNT, TABLE_COLUMNS } from './table-view.constants';
import { SortKey, SortOrder } from './table-view.types';
import { sortComponents } from './table-view.utils';

interface ComponentsTableViewProps {
  components: InstanceComponent[];
}

export const ComponentsTableView = ({ components }: ComponentsTableViewProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const sorted = useMemo(
    () => sortComponents(components, sortKey, sortOrder),
    [components, sortKey, sortOrder]
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortOrder('asc');
  };

  return (
    <TableContainer data-testid="components-table-view">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            {TABLE_COLUMNS.map(({ label, sortKey: columnKey }) => (
              <TableCell key={label}>
                {columnKey ? (
                  <TableSortLabel
                    active={sortKey === columnKey}
                    direction={sortKey === columnKey ? sortOrder : 'asc'}
                    onClick={() => handleSort(columnKey)}
                  >
                    {label}
                  </TableSortLabel>
                ) : (
                  label
                )}
              </TableCell>
            ))}
            <TableCell align="right">{Messages.columns.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={TABLE_COLUMN_COUNT} align="center">
                {Messages.noComponents}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((component) => (
              <ComponentRow key={component.name} component={component} />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
