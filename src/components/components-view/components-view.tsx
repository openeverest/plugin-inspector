import { useMemo, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import {
  Box,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@openeverest/ui-lib';
import { InstanceComponent } from 'types/components.types';
import { Messages } from './components-view.messages';
import { filterComponents } from './components-view.utils';
import { ComponentsDiagramView } from './diagram-view/components-diagram-view';
import { ComponentsTableView } from './table-view/components-table-view';

interface ComponentsViewProps {
  components: InstanceComponent[];
}

export const ComponentsView = ({ components }: ComponentsViewProps) => {
  const [tableView, setTableView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filtered = useMemo(
    () => filterComponents(components, searchQuery),
    [components, searchQuery]
  );

  return (
    <Stack sx={{ gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label={Messages.search}
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 380 }}
        />
        <FormControlLabel
          sx={{ ml: 'auto' }}
          control={
            <Switch
              checked={tableView}
              onChange={(_, checked) => setTableView(checked)}
            />
          }
          label={Messages.tableView}
        />
      </Box>
      {tableView ? (
        <ComponentsTableView components={filtered} />
      ) : (
        <ReactFlowProvider>
          <ComponentsDiagramView components={filtered} />
        </ReactFlowProvider>
      )}
    </Stack>
  );
};
