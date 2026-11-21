// @vitest-environment jsdom
import { createElement,act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach,describe,it,expect,vi } from 'vitest';
import { AuditHistory,auditDiff,matchAuditRecord,safeAuditHref,type AuditRow } from './audit';
import { formatDateTime } from './format';
import { api } from './custom-fetch';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML='';});
const id='11111111-1111-4111-8111-111111111111';
const row:AuditRow={id,domain:'finance',action:'REVERSED',outcome:'success',occurredAt:'2026-11-21T12:34:56.123Z',entityType:'JournalEntry',entityId:id,branchId:null,actor:{id:'system',type:'SYSTEM',name:'System'},reason:'Corrected entry',before:{total:'12.30',lines:[{debit:'0.01'}]},after:{total:'0.00',lines:[{debit:'0.00'}]},details:{currency:'EGP'},sources:[{entityType:'JournalEntry',entityId:id}],historicalCoverage:'Recorded only'};
describe('shared audit history',()=>{
 it('matches only real record IDs, not list/new/edit pages',()=>{
  const routes=[{pattern:/^\/journals\/([^/]+)$/,entityType:'JournalEntry'}];expect(matchAuditRecord('/journals/'+id,routes)).toEqual({entityType:'JournalEntry',entityId:id});for(const path of ['/journals/new','/journals','/journals/'+id+'/edit'])expect(matchAuditRecord(path,routes)).toBeUndefined();
 });
 it('allows only host-provided same-app source links',()=>{expect(safeAuditHref('/journals/'+id)).toBe('/journals/'+id);for(const href of ['javascript:alert(1)','https://external.invalid','//external.invalid','/bad\\path','/has space'])expect(safeAuditHref(href)).toBeUndefined();});
 it('preserves exact decimals and nested line differences',()=>{expect(auditDiff(row.before,row.after)).toEqual([{field:'total',before:'12.30',after:'0.00'},{field:'lines.0.debit',before:'0.01',after:'0.00'}]);expect(auditDiff({status:'POSTED'},{status:'POSTED'})).toEqual([]);});
 it('includes exact occurrence time and timezone offset',()=>{const result=formatDateTime(row.occurredAt,'Africa/Cairo','en');expect(result).toContain('14:34:56.123');expect(result).toContain('GMT+02:00');expect(formatDateTime('invalid')).toBe('invalid');});
 it('makes no history request without explicit permission',async()=>{
  const get=vi.spyOn(api,'get').mockResolvedValue(null);const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>root.render(createElement(AuditHistory,{domain:'finance',record:{entityType:'JournalEntry',entityId:id},canRead:false})));expect(get).not.toHaveBeenCalled();expect(host.textContent).toBe('');await act(async()=>root.unmount());
 });
 it('renders actor, reason, precise time, expandable diff and real source link without changing the page URL',async()=>{
  vi.spyOn(api,'get').mockImplementation(async path=>String(path).includes('/audit/')?{data:[row],pagination:{page:1,pageSize:10,total:1}}:null);
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);history.replaceState({},'','/journals/'+id+'?tab=main');const before=location.href;
  await act(async()=>root.render(createElement(AuditHistory,{domain:'finance',record:{entityType:'JournalEntry',entityId:id},canRead:true,sourceHref:()=>'/journals/'+id})));
  expect(host.textContent).toContain('REVERSED');expect(host.textContent).toContain('Corrected entry');expect(host.textContent).toContain('12.30');expect(host.textContent).toContain('0.00');expect(host.querySelector('time')?.dateTime).toBe(row.occurredAt);expect(host.querySelector('a')?.getAttribute('href')).toBe('/journals/'+id);expect(location.href).toBe(before);expect(host.textContent).not.toContain('[object Object]');await act(async()=>root.unmount());
 });
 it('keeps failure distinct from an empty history',async()=>{
  vi.spyOn(api,'get').mockRejectedValue(new Error('FORBIDDEN'));const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>root.render(createElement(AuditHistory,{domain:'finance',record:{entityType:'JournalEntry',entityId:id},canRead:true})));expect(host.querySelector('[role=alert]')).not.toBeNull();expect(host.textContent).not.toContain('No recorded events match');await act(async()=>root.unmount());
 });
});
