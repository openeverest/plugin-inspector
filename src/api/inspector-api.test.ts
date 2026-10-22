import { describe, expect, it, vi } from 'vitest';
import { getInstanceComponents, getInstanceServices } from './inspector-api';

const target = { namespace: 'db', instanceName: 'mydb' };

describe('list endpoints', () => {
  it.each([
    ['components', getInstanceComponents],
    ['services', getInstanceServices],
  ])('treat a null %s body as an empty list', async (_, getList) => {
    const pluginFetch = vi.fn().mockResolvedValue(new Response('null'));

    await expect(getList(pluginFetch, target)).resolves.toEqual([]);
  });
});
