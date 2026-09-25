import type { ReactNode } from 'react';
import { Tooltip, Typography } from '@openeverest/ui-lib';
import { format, formatDuration, intervalToDuration, isValid } from 'date-fns';
import { AGE_UNITS, DATE_FORMAT } from './component-age.constants';
import { Messages } from './component-age.messages';

export interface ComponentAgeProps {
  date?: string;
  render?: (age: string) => ReactNode;
  variant?: 'caption' | 'body2';
}

export const ComponentAge = ({
  date,
  render,
  variant = 'caption',
}: ComponentAgeProps) => {
  const started = date ? new Date(date) : null;
  const valid = started !== null && isValid(started);
  const duration = valid
    ? formatDuration(intervalToDuration({ start: started, end: Date.now() }), {
        format: AGE_UNITS,
      })
    : '';
  const age = duration ? Messages.ago(duration) : '';

  return (
    <Tooltip
      title={valid ? Messages.startedAt(format(started, DATE_FORMAT)) : ''}
      placement="right"
      arrow
    >
      <Typography variant={variant} sx={{ color: 'text.secondary' }}>
        {render ? render(age) : age}
      </Typography>
    </Tooltip>
  );
};
