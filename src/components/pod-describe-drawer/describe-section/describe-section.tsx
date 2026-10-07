import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

interface DescribeSectionProps {
  title: string;
  children: ReactNode;
}

export const DescribeSection = ({ title, children }: DescribeSectionProps) => (
  <Stack component="section" sx={{ gap: 1 }}>
    <Typography variant="subtitle2" component="h3">
      {title}
    </Typography>
    {children}
  </Stack>
);
