import { useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { IconButton, TableCell, TableRow } from '@mui/material';
import { ComponentGroupSummary } from 'components/component-group-summary/component-group-summary';
import { ComponentGroup } from 'types/components.types';
import { Messages } from '../../components-view.messages';
import { ComponentRow } from '../component-row/component-row';
import { TABLE_COLUMN_COUNT } from '../table-view.constants';

interface GroupRowsProps {
  group: ComponentGroup;
}

export const GroupRows = ({ group }: GroupRowsProps) => {
  const [open, setOpen] = useState(true);

  return (
    <>
      <TableRow data-testid={`group-row-${group.name}`} sx={{ '& > td': { bgcolor: 'action.hover' } }}>
        <TableCell padding="checkbox">
          <IconButton
            size="small"
            aria-expanded={open}
            aria-label={open ? Messages.collapseGroup : Messages.expandGroup}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell colSpan={TABLE_COLUMN_COUNT - 1}>
          <ComponentGroupSummary group={group} />
        </TableCell>
      </TableRow>
      {open && group.pods.map((pod) => <ComponentRow key={pod.name} component={pod} />)}
    </>
  );
};
