import type { ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Paper, Stack } from '@openeverest/ui-lib';

interface DiagramNodeProps {
  width: number;
  height: number;
  children: ReactNode;
  elevated?: boolean;
  clickable?: boolean;
  showTopHandle?: boolean;
  showBottomHandle?: boolean;
  dataTestId?: string;
}

export const DiagramNode = ({
  width,
  height,
  children,
  elevated = false,
  clickable = false,
  showTopHandle = false,
  showBottomHandle = false,
  dataTestId,
}: DiagramNodeProps) => (
  <>
    {showTopHandle && (
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    )}
    <Paper
      variant={elevated ? 'elevation' : 'outlined'}
      elevation={elevated ? 4 : 0}
      data-testid={dataTestId}
      sx={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <Stack sx={{ p: 2, minHeight: height, width }}>{children}</Stack>
    </Paper>
    {showBottomHandle && (
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    )}
  </>
);
