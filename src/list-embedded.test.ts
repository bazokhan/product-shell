// @vitest-environment jsdom
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListPage, DetailActions } from './list-page';
import { api, downloadFile } from './custom-fetch';
vi.mock('./custom-fetch',async importOriginal=>({...await importOriginal<typeof import('./custom-fetch')>(),downloadFile:vi.fn()}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML='';});
describe('complete embedded rows',()=>{
 it('uses supplied rows, including empty arrays, without list calls or changing the owning URL',async()=>{
  const get=vi.spyOn(api,'get').mockResolvedValue(null);
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  history.replaceState({},'','/report?sort=entryDate:desc&page=2');const before=location.href;
  const props={path:'',listId:'accounting.test.embedded',columns:[{id:'name',header:'الاسم',cell:(row:{id:string;name:string})=>row.name}],getRowId:(row:{id:string;name:string})=>row.id};
  await act(async()=>root.render(createElement(ListPage<{id:string;name:string}>,{...props,rows:[{id:'1',name:'قيد فعلي'}]})));
  expect(host.textContent).toContain('قيد فعلي');expect(host.querySelector('input[type=search]')).toBeNull();expect(get.mock.calls.every(([path])=>String(path).includes('/preferences/'))).toBe(true);expect(location.href).toBe(before);
  await act(async()=>root.render(createElement(ListPage<{id:string;name:string}>,{...props,rows:[]})));
  expect(host.textContent).not.toContain('قيد فعلي');expect(get.mock.calls.every(([path])=>String(path).includes('/preferences/'))).toBe(true);
  await act(async()=>root.unmount());
 });
});
describe('detail actions',()=>{
 it('does not download when disabled and reports PDF errors visibly',async()=>{
  vi.mocked(downloadFile).mockRejectedValue(new Error('FORBIDDEN'));
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(createElement(DetailActions,{pdfPath:'/accounting/journals/1?format=pdf',fileName:'JV1',disabled:true})));
  expect([...host.querySelectorAll('button')].every(b=>b.disabled)).toBe(true);
  await act(async()=>root.render(createElement(DetailActions,{pdfPath:'/accounting/journals/1?format=pdf',fileName:'JV1'})));
  await act(async()=>host.querySelector('button')!.click());
  expect(downloadFile).toHaveBeenCalledWith('/accounting/journals/1?format=pdf','JV1.pdf');expect(host.querySelector('[role=alert]')?.textContent).toBe('FORBIDDEN');
  await act(async()=>root.unmount());
 });
});
