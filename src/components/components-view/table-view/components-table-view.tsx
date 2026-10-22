import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import { InstanceComponent } from 'types/components.types';
import { InstanceService } from 'types/services.types';
import { groupComponents } from 'utils/component-groups.utils';
import { Messages } from '../components-view.messages';
import { GroupRows } from './group-rows/group-rows';
import { ServicesTable } from './services-table/services-table';
import { TABLE_COLUMN_COUNT, TABLE_COLUMNS } from './table-view.constants';
import { SortKey, SortOrder } from './table-view.types';
import { sortComponents } from './table-view.utils';

interface ComponentsTableViewProps {
  components: InstanceComponent[];
  services: InstanceService[];
}

export const ComponentsTableView = ({ components, services }: ComponentsTableViewProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const groups = useMemo(
    () =>
      groupComponents(components).map((group) => ({
        ...group,
        pods: sortComponents(group.pods, sortKey, sortOrder),
      })),
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
    <>
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
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={TABLE_COLUMN_COUNT} align="center">
                  {Messages.noComponents}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => <GroupRows key={group.name} group={group} />)
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {services.length > 0 && <ServicesTable services={services} />}
    </>
  );
};
