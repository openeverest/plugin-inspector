import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@openeverest/ui-lib';
import { InstanceTarget } from 'api/inspector-api';
import { SUNKEN_SURFACE_SX } from 'components/surface.constants';
import { useComponentLogsStream } from 'hooks/useComponentLogsStream';
import { InstanceComponent, LogsSelection } from 'types/components.types';
import { hasLogs } from 'utils/component-status.utils';
import {
  COPY_FEEDBACK_MS,
  LOGS_MAX_HEIGHT,
  LOGS_MIN_HEIGHT,
} from './logs-panel.constants';
import { Messages } from './logs-panel.messages';
import {
  downloadText,
  filterLogLines,
  hasAnyLogs,
  mustShowPrevious,
} from './logs-panel.utils';

interface LogsPanelProps {
  target: InstanceTarget;
  components: InstanceComponent[];
  selection: LogsSelection;
  onSelectionChange: (selection: LogsSelection) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  onClose: () => void;
}

export const LogsPanel = ({
  target,
  components,
  selection,
  onSelectionChange,
  filter,
  onFilterChange,
  onClose,
}: LogsPanelProps) => {
  const [previousToggle, setPreviousToggle] = useState(false);
  const [copied, setCopied] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  const pods = useMemo(() => components.filter(hasLogs), [components]);
  const pod = components.find((c) => c.name === selection.pod);
  const containers = useMemo(() => pod?.containers.filter(hasAnyLogs) ?? [], [pod]);
  const container =
    containers.find((c) => c.name === selection.container) ?? containers[0];
  const forcedPrevious = container ? mustShowPrevious(container) : false;
  const previous = forcedPrevious || previousToggle;

  const { logs, isConnecting, error, getFullLogs } = useComponentLogsStream(
    target,
    selection.pod,
    { container: container?.name, previous, enabled: !!pod && !!container }
  );
  // Refiltering up to 10k lines per keystroke shouldn't block typing.
  const deferredFilter = useDeferredValue(filter);
  const filtered = useMemo(() => filterLogLines(logs, deferredFilter), [logs, deferredFilter]);
  const isFiltering = deferredFilter.trim() !== '';

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [filtered.text]);

  // Copy/download export what the user sees: the filter applies to the full logs too.
  const getExportedLogs = async () => filterLogLines(await getFullLogs(), filter).text;

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(await getExportedLogs());
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  const handleDownload = async () => {
    downloadText(
      await getExportedLogs(),
      Messages.fileName(target.instanceName, selection.pod, container?.name ?? '')
    );
  };

  const renderBody = () => {
    if (!pod) {
      return <Alert severity="info">{Messages.noPod}</Alert>;
    }
    if (error) {
      return <Alert severity="error">{Messages.loadFailed(error.message)}</Alert>;
    }
    if (isConnecting) {
      return <Typography sx={{ color: 'text.secondary' }}>{Messages.connecting}</Typography>;
    }
    if (!logs) {
      return <Typography sx={{ color: 'text.secondary' }}>{Messages.noLogs}</Typography>;
    }
    if (isFiltering && filtered.matched === 0) {
      return (
        <Typography sx={{ color: 'text.secondary' }}>
          {Messages.noMatches(deferredFilter.trim())}
        </Typography>
      );
    }
    return (
      <Typography
        component="pre"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          m: 0,
        }}
      >
        {filtered.text}
      </Typography>
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="logs-panel">
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h6">{Messages.title}</Typography>
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <InputLabel id="inspector-pod-select-label">{Messages.pod}</InputLabel>
          <Select
            labelId="inspector-pod-select-label"
            label={Messages.pod}
            value={pod ? selection.pod : ''}
            onChange={(e) => onSelectionChange({ pod: e.target.value })}
          >
            {pods.map((c) => (
              <MenuItem key={c.name} value={c.name}>
                {c.type ? `${c.name} (${c.type})` : c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {containers.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel id="inspector-container-select-label">{Messages.container}</InputLabel>
            <Select
              labelId="inspector-container-select-label"
              label={Messages.container}
              value={container?.name ?? ''}
              onChange={(e) =>
                onSelectionChange({ pod: selection.pod, container: e.target.value })
              }
            >
              {containers.map((c) => (
                <MenuItem key={c.name} value={c.name}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Tooltip title={Messages.previousHint}>
          <FormControlLabel
            control={
              <Switch
                checked={previous}
                disabled={forcedPrevious || !container || container.restarts === 0}
                onChange={(_, checked) => setPreviousToggle(checked)}
              />
            }
            label={Messages.previous}
          />
        </Tooltip>
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          {logs && (
            <>
              <Tooltip title={copied ? Messages.copied : Messages.copy}>
                <IconButton size="small" onClick={handleCopy} aria-label={Messages.copy}>
                  <ContentCopyOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={Messages.download}>
                <IconButton size="small" onClick={handleDownload} aria-label={Messages.download}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title={Messages.close}>
            <IconButton size="small" onClick={onClose} aria-label={Messages.close}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 1 }}>
        <TextField
          size="small"
          placeholder={Messages.filter}
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          sx={{ width: 380 }}
          slotProps={{
            htmlInput: { 'aria-label': Messages.filter },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: filter && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => onFilterChange('')}
                    aria-label={Messages.clearFilter}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        {isFiltering && logs && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {Messages.matchCount(filtered.matched, filtered.total)}
          </Typography>
        )}
      </Stack>
      <Box
        ref={logsRef}
        sx={{
          ...SUNKEN_SURFACE_SX,
          minHeight: LOGS_MIN_HEIGHT,
          maxHeight: LOGS_MAX_HEIGHT,
          overflow: 'auto',
          p: 1.5,
        }}
      >
        {renderBody()}
      </Box>
    </Paper>
  );
};
