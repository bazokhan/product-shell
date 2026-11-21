// @vitest-environment jsdom
import {createElement,act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {ListPage,configureListMeta} from './list-page';
import {api} from './custom-fetch';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML='';});
it('removes old rows on failed refresh, announces error, preserves URL query, and retries the same request',async()=>{
 configureListMeta({});history.replaceState({},'','/items?q=preserved');
 let fail=false,resolve!:(v:unknown)=>void;
 const page={data:[{id:'1',name:'Original row'}],pagination:{page:1,pageSize:25,total:1}};
 const get=vi.spyOn(api,'get').mockImplementation(async(path:string)=>path.includes('preferences')?null:fail?new Promise(r=>{resolve=r;}):page as never);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const props={path:'/items',exportable:false,columns:[{id:'name',header:'Name',cell:(r:{id:string;name:string})=>r.name}],getRowId:(r:{id:string})=>r.id};
 await act(async()=>root.render(createElement(ListPage<{id:string;name:string}>,{...props,reloadKey:0})));
 expect(host.textContent).toContain('Original row');fail=true;
 await act(async()=>root.render(createElement(ListPage<{id:string;name:string}>,{...props,reloadKey:1})));
 expect(host.textContent).not.toContain('Original row');expect(host.querySelector('[aria-busy=true]')).not.toBeNull();
 // Reject an in-flight request without leaking its old successful rows.
 await act(async()=>resolve(Promise.reject(new Error('Forbidden'))));
 expect(host.querySelector('[role=alert]')?.textContent).toContain('Forbidden');expect(host.textContent).not.toContain('Original row');expect(host.querySelector('input')?.value).toBe('preserved');expect(location.search).toBe('?q=preserved');
 fail=false;await act(async()=>host.querySelector<HTMLButtonElement>('[role=alert] button')!.click());
 expect(host.querySelector('[role=alert]')).toBeNull();expect(host.textContent).toContain('Original row');expect(get.mock.calls.at(-1)?.[1]).toMatchObject({q:'preserved',page:1});
 await act(async()=>root.unmount());
});
