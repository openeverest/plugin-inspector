import { describe, expect, it } from 'vitest';
import { filterLogLines } from './logs-panel.utils';

const LOGS = 'INFO started\nERROR disk full\nwarn slow query\nerror: retrying\n';

describe('filterLogLines', () => {
  it('keeps matching lines case-insensitively and counts them', () => {
    expect(filterLogLines(LOGS, 'Error')).toEqual({
      text: 'ERROR disk full\nerror: retrying',
      matched: 2,
      total: 4,
    });
  });

  it('returns the logs untouched for a blank query', () => {
    expect(filterLogLines(LOGS, '  ')).toEqual({ text: LOGS, matched: 4, total: 4 });
  });

  it('reports no matches', () => {
    expect(filterLogLines(LOGS, 'panic')).toEqual({ text: '', matched: 0, total: 4 });
  });
});
