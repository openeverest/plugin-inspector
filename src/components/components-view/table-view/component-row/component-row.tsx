import { useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Collapse,
  IconButton,
  TableCell,
  TableRow,
  Tooltip,
} from '@openeverest/ui-lib';
import { ComponentAge } from 'components/component-age/component-age';
import { useInspectorContext } from 'components/inspector-context/inspector.context';
import { StatusIndicator } from 'components/status-indicator/status-indicator';
import { InstanceComponent } from 'types/components.types';
import { componentBaseStatus, hasLogs } from 'utils/component-status.utils';
import { Messages } from '../../components-view.messages';
import { ContainersTable } from '../containers-table/containers-table';
import { TABLE_COLUMN_COUNT } from '../table-view.constants';

interface ComponentRowProps {
  component: InstanceComponent;
}

export const ComponentRow = ({ component }: ComponentRowProps) => {
  const [open, setOpen] = useState(false);
  const { viewLogs, describePod } = useInspectorContext();

  return (
    <>
      <TableRow hover sx={{ '& > td': { borderBottom: open ? 0 : undefined } }}>
        <TableCell padding="checkbox">
          <IconButton
            size="small"
            aria-label={open ? Messages.collapseRow : Messages.expandRow}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <StatusIndicator
            status={componentBaseStatus(component)}
            label={component.status}
            reason={component.reason}
          />
        </TableCell>
        <TableCell>{component.ready}</TableCell>
        <TableCell>{component.name}</TableCell>
        <TableCell>{component.type}</TableCell>
        <TableCell>{component.nodeName}</TableCell>
        <TableCell>
          <ComponentAge date={component.started} />
        </TableCell>
        <TableCell>{component.restarts}</TableCell>
        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          <Tooltip title={Messages.describe}>
            <IconButton
              size="small"
              aria-label={Messages.describe}
              onClick={() => describePod(component.name)}
            >
              <InfoOutlinedIcon />
            </IconButton>
          </Tooltip>
          {hasLogs(component) && (
            <Tooltip title={Messages.viewLogs}>
              <IconButton
                size="small"
                aria-label={Messages.viewLogs}
                onClick={() => viewLogs(component.name)}
              >
                <VisibilityOutlinedIcon />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={TABLE_COLUMN_COUNT} sx={{ py: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <ContainersTable component={component} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};
