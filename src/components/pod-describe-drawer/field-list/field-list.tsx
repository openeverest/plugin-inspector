import type { ReactNode } from 'react';
import { Box, Typography } from '@openeverest/ui-lib';

export interface Field {
  label: string;
  value?: ReactNode;
}

interface FieldListProps {
  fields: Field[];
}

// Label/value grid, like the header block of `kubectl describe`. Empty values are skipped.
export const FieldList = ({ fields }: FieldListProps) => (
  <Box
    component="dl"
    sx={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 2, rowGap: 0.5, m: 0 }}
  >
    {fields
      .filter(({ value }) => value !== undefined && value !== '')
      .map(({ label, value }) => (
        <Box key={label} sx={{ display: 'contents' }}>
          <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: 'break-word' }}>
            {value}
          </Typography>
        </Box>
      ))}
  </Box>
);
