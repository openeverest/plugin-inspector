import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ComponentStatus, InstanceComponent } from 'types/components.types';
import { ComponentsTableView } from './components-table-view';

const pod = (
  name: string,
  component: string,
  status = ComponentStatus.Running
): InstanceComponent => ({
  name,
  component,
  status,
  restarts: 0,
  ready: '1/1',
  containers: [],
});

const components = [
  pod('db-rs0-1', 'engine'),
  pod('db-mongos-0', 'proxy'),
  pod('db-rs0-0', 'engine', ComponentStatus.Pending),
];

const rowNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.getAttribute('data-testid') ?? within(row).queryAllByRole('cell')[3]?.textContent)
    .filter(Boolean);

describe('ComponentsTableView', () => {
  afterEach(cleanup);

  it('lists pods under their component, sorted within each group', () => {
    render(<ComponentsTableView components={components} />);

    expect(rowNames()).toEqual([
      'group-row-engine',
      'db-rs0-0',
      'db-rs0-1',
      'group-row-proxy',
      'db-mongos-0',
    ]);
    expect(within(screen.getByTestId('group-row-engine')).getByText('1/2 pods ready')).toBeTruthy();
  });

  it('hides and shows the pods of a group', () => {
    render(<ComponentsTableView components={components} />);
    const engineRow = screen.getByTestId('group-row-engine');

    fireEvent.click(within(engineRow).getByRole('button', { name: 'Hide pods' }));
    expect(screen.queryByText('db-rs0-0')).toBeNull();
    expect(screen.getByText('db-mongos-0')).toBeTruthy();

    fireEvent.click(within(engineRow).getByRole('button', { name: 'Show pods' }));
    expect(screen.getByText('db-rs0-0')).toBeTruthy();
  });
});
