// @vitest-environment jsdom
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListPage, configureListMeta } from './list-page';
import { api } from './custom-fetch';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount() {
  configureListMeta({});
  vi.spyOn(api, 'get').mockImplementation(async (path: string) => path.includes('preferences') ? null : { data: [{ id: 'j-1', name: 'قيد اختبار' }], pagination: { page: 1, pageSize: 25, total: 1 } } as never);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(ListPage<{id:string; name:string}>, { path: '/journals', exportable: false, columns: [{ id: 'name', header: 'Name', cell: (row) => row.name }], getRowId: (row) => row.id, bulkActions: [{ action: 'post', label: 'Post selected', confirm: 'Post {{count}} journals?' }] })));
  await act(async () => (host.querySelector('input[type="checkbox"]') as HTMLInputElement).click());
  const button = () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Post selected')!;
  return { host, root, button };
}
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });
describe('bulk action safeguards', () => {
  it('does not send when confirmation is cancelled', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ succeeded: ['j-1'], failed: [] });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { root, button } = await mount();
    await act(async () => button().click());
    expect(confirm).toHaveBeenCalledWith('Post 1 journals?');
    expect(post).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
  it('locks duplicate submissions, reports row failures, and keeps failed rows selected', async () => {
    let resolve!: (value: unknown) => void;
    const post = vi.spyOn(api, 'post').mockImplementation(() => new Promise((r) => { resolve = r; }) as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { host, root, button } = await mount();
    await act(async () => { button().click(); button().click(); });
    expect(post).toHaveBeenCalledTimes(1);
    expect(button().disabled).toBe(true);
    expect(post).toHaveBeenCalledWith('/journals/bulk', { action: 'post', ids: ['j-1'] });
    await act(async () => resolve({ succeeded: [], failed: [{ id: 'j-1', code: 'MAKER_CHECKER_REQUIRED', message: 'Needs another poster' }] }));
    expect(host.textContent).toContain('j-1: MAKER_CHECKER_REQUIRED');
    expect(button().disabled).toBe(false);
    await act(async () => root.unmount());
  });
  it('shows request errors without losing selection', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('Denied'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { host, root, button } = await mount();
    await act(async () => button().click());
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Denied');
    expect(button()).toBeTruthy();
    await act(async () => root.unmount());
  });
});
