import type { Duration } from 'date-fns';

export const DATE_FORMAT = "dd'/'MM'/'yyyy 'at' HH':'mm";

export const AGE_UNITS: (keyof Duration)[] = ['years', 'months', 'days', 'hours', 'minutes'];
