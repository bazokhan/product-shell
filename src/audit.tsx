import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from './custom-fetch';
import { ListPage, listMetaFor, type ListColumn, type Page } from './list-page';
import { PaginationBar } from './pagination-bar';
import { UserDisplay, type UserReference } from './user-display';
import { formatDateTime } from './format';

export type AuditDomain='finance'|'hr'|'operations'|'security';
export type AuditSource={entityType:string;entityId:string};
export type AuditRow={id:string;domain:AuditDomain;action:string;outcome:string;occurredAt:string;entityType:string;entityId:string|null;branchId:string|null;actor:UserReference;reason:string|null;before:Record<string,unknown>;after:Record<string,unknown>;details:Record<string,unknown>;sources:AuditSource[];historicalCoverage:string};
export type AuditRoute={pattern:RegExp;entityType:string};
export type AuditLinkResolver=(source:AuditSource)=>string|undefined;
const UUID=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const CONTROL='h-9 rounded-md border border-input bg-background px-3 text-sm';
const BUTTON=CONTROL+' hover:bg-accent disabled:opacity-50';
export function auditCopy(locale:string){return locale.startsWith('ar')?{
 title:'سجل التدقيق',history:'سجل التغييرات',who:'بواسطة',time:'الوقت والمنطقة الزمنية',action:'الإجراء',record:'السجل',outcome:'النتيجة',reason:'السبب',details:'التفاصيل والمصادر',before:'قبل',after:'بعد',field:'الحقل',none:'غير مسجل',unchanged:'لم يُحفظ فرق قبل/بعد لهذا الحدث.',coverage:'تظهر الأحداث المسجلة فقط. قد لا تتوفر أحداث للتغييرات القديمة. السجل الفارغ لا يثبت عدم حدوث تغيير.',refresh:'تحديث السجل',loading:'جار تحميل السجل...',empty:'لا توجد أحداث مسجلة ضمن نطاقك والفلاتر المختارة.',failed:'تعذر تحميل السجل. هذا لا يعني أنه فارغ.',apply:'تطبيق الفلاتر',from:'من وقت',to:'إلى وقت',actor:'معرف المنفذ',entity:'نوع السجل',entityId:'معرف السجل',all:'الكل',sources:'المصادر',success:'نجاح',failure:'فشل',finance:'المالية',hr:'الموارد البشرية',operations:'العمليات',security:'الأمان',domain:'نوع التدقيق',denied:'ليس لديك صلاحية قراءة هذا السجل.',changes:'الفروق المسجلة',facts:'تفاصيل الحدث',eventId:'معرف الحدث',utc:'وقت UTC الأصلي'
}:{title:'Audit register',history:'Change history',who:'Actor',time:'Time and timezone',action:'Action',record:'Record',outcome:'Outcome',reason:'Reason',details:'Details and sources',before:'Before',after:'After',field:'Field',none:'Not recorded',unchanged:'No before/after diff was captured for this event.',coverage:'Recorded events only. Older changes may have no captured event. An empty history does not prove that no change occurred.',refresh:'Refresh history',loading:'Loading history...',empty:'No recorded events match your scope and filters.',failed:'History could not be loaded. This does not mean it is empty.',apply:'Apply filters',from:'From time',to:'To time',actor:'Actor ID',entity:'Entity type',entityId:'Entity ID',all:'All',sources:'Sources',success:'Success',failure:'Failure',finance:'Finance',hr:'HR',operations:'Operations',security:'Security',domain:'Audit domain',denied:'You do not have permission to read this history.',changes:'Recorded changes',facts:'Event details',eventId:'Event ID',utc:'Original UTC time'};}
export function matchAuditRecord(pathname:string,routes:AuditRoute[]):AuditSource|undefined{
 for(const route of routes){const match=route.pattern.exec(pathname);if(match&&UUID.test(match[1]??''))return {entityType:route.entityType,entityId:match[1]};}return undefined;
}
export function safeAuditHref(href:string|undefined):string|undefined{return href&&href.startsWith('/')&&!href.startsWith('//')&&!/[\\\s]/.test(href)?href:undefined;}
function flatten(value:unknown,prefix='',result:Record<string,unknown>={}):Record<string,unknown>{
 if(value&&typeof value==='object'){for(const [key,item] of Object.entries(value)){flatten(item,prefix?prefix+'.'+key:key,result);}}else if(prefix)result[prefix]=value;return result;
}
export function auditDiff(before:Record<string,unknown>,after:Record<string,unknown>){const left=flatten(before),right=flatten(after);return [...new Set([...Object.keys(left),...Object.keys(right)])].filter(key=>JSON.stringify(left[key])!==JSON.stringify(right[key])).map(field=>({field,before:left[field],after:right[field]}));}
function valueText(value:unknown,missing:string):string{return value===undefined?missing:value===null?'null':typeof value==='object'?JSON.stringify(value):String(value);}
function AuditEventDetails({row,sourceHref,locale}:{row:AuditRow;sourceHref?:AuditLinkResolver;locale:string}){
 const copy=auditCopy(locale),diff=auditDiff(row.before??{},row.after??{});
 return <details className="min-w-48 max-w-2xl whitespace-normal"><summary className="cursor-pointer text-primary underline">{copy.details}</summary><div className="space-y-4 py-3">
  <p className="break-all text-xs"><span>{copy.eventId}: </span><bdi>{row.id}</bdi></p><p className="text-xs">{copy.utc}: <time dateTime={row.occurredAt} dir="ltr">{row.occurredAt}</time></p>
  <div className="space-y-2"><h4 className="font-semibold">{copy.changes}</h4>{diff.length?diff.map(change=><div key={change.field} className="rounded-md border p-2 text-xs"><p className="break-all font-mono" dir="ltr">{change.field}</p><p className="break-all"><span className="text-muted-foreground">{copy.before}: </span><bdi>{valueText(change.before,copy.none)}</bdi></p><p className="break-all"><span className="text-muted-foreground">{copy.after}: </span><bdi>{valueText(change.after,copy.none)}</bdi></p></div>):<p className="text-muted-foreground">{copy.unchanged}</p>}</div>
  {Object.keys(row.details??{}).length>0&&<div><h4 className="font-semibold">{copy.facts}</h4><dl className="space-y-1 text-xs">{Object.entries(flatten(row.details)).map(([key,value])=><div key={key} className="break-all"><dt className="inline font-mono" dir="ltr">{key}: </dt><dd className="inline"><bdi>{valueText(value,copy.none)}</bdi></dd></div>)}</dl></div>}
  {row.sources?.length>0&&<div><h4 className="font-semibold">{copy.sources}</h4><ul className="space-y-1 text-xs">{row.sources.map(source=>{const href=safeAuditHref(sourceHref?.(source));const label=source.entityType+' · '+source.entityId;return <li key={source.entityType+source.entityId} className="break-all">{href?<a className="text-primary underline" href={href}><bdi>{label}</bdi></a>:<bdi>{label}</bdi>}</li>;})}</ul></div>}
 </div></details>;
}
function columns(locale:string,sourceHref?:AuditLinkResolver):ListColumn<AuditRow>[] {const copy=auditCopy(locale);return [
 {id:'occurredAt',header:copy.time,cell:row=><time className="whitespace-nowrap" dateTime={row.occurredAt} title={row.occurredAt} dir="auto">{formatDateTime(row.occurredAt,undefined,locale)}</time>},
 {id:'actor',header:copy.who,cell:row=><UserDisplay user={row.actor} locale={locale}/>},
 {id:'action',header:copy.action,cell:row=><bdi className="font-mono text-xs">{row.action}</bdi>},
 {id:'entityType',header:copy.record,cell:row=><div className="max-w-52 break-all"><bdi>{row.entityType}</bdi><p className="text-xs text-muted-foreground" dir="ltr">{row.entityId}</p></div>},
 {id:'outcome',header:copy.outcome,cell:row=>row.outcome==='success'?copy.success:row.outcome==='failure'?copy.failure:row.outcome},
 {id:'reason',header:copy.reason,cell:row=><span className="block max-w-72 whitespace-pre-wrap break-words" dir="auto">{row.reason||copy.none}</span>},
 {id:'details',header:copy.details,cell:row=><AuditEventDetails row={row} locale={locale} sourceHref={sourceHref}/>},
];}
export function AuditHistory({domain,record,canRead,sourceHref,reloadKey,branchId}:{domain:AuditDomain;record:AuditSource;canRead:boolean;sourceHref?:AuditLinkResolver;reloadKey?:unknown;branchId?:string}){
 const {i18n}=useTranslation(),copy=auditCopy(i18n.language||'ar');const [page,setPage]=useState(1),[tick,setTick]=useState(0);const [result,setResult]=useState<Page<AuditRow>|null>(null),[error,setError]=useState(false);
 const path=`/audit/records/${encodeURIComponent(record.entityType)}/${encodeURIComponent(record.entityId)}`;
 useEffect(()=>{setPage(1);setResult(null);},[path,domain,branchId]);
 useEffect(()=>{if(!canRead)return;let alive=true;setError(false);api.get<Page<AuditRow>>(path,{domain,page,pageSize:10,branchId}).then(value=>{if(alive)setResult(value);}).catch(()=>{if(alive){setError(true);setResult(null);}});return()=>{alive=false;};},[path,domain,page,tick,canRead,reloadKey,branchId]);
 if(!canRead)return null;
 return <section aria-label={copy.history} className="mt-6 space-y-3 rounded-lg border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{copy.history}</h2><button type="button" className={BUTTON} onClick={()=>setTick(x=>x+1)}>{copy.refresh}</button></div><p className="text-sm text-muted-foreground">{copy.coverage}</p>{error?<p role="alert" className="text-destructive">{copy.failed}</p>:!result?<p role="status">{copy.loading}</p>:result.data.length===0?<p>{copy.empty}</p>:<><ListPage path="" listId={'audit.history.'+domain} rows={result.data} columns={columns(i18n.language||'ar',sourceHref)} getRowId={row=>row.id}/><PaginationBar {...result.pagination} onPageChange={setPage}/></>}</section>;
}
export function AuditRouteHistory({pathname,routes,...props}:Omit<Parameters<typeof AuditHistory>[0],'record'>&{pathname:string;routes:AuditRoute[]}){const record=matchAuditRecord(pathname,routes);return record?<AuditHistory key={props.domain+record.entityType+record.entityId} {...props} record={record}/>:null;}
const INPUT_KEYS=['action','actorId','entityId','dateFrom','dateTo'] as const;
export function AuditRegister({domain,canRead,sourceHref,branchId,toolbar}:{domain:AuditDomain;canRead:boolean;sourceHref?:AuditLinkResolver;branchId?:string;toolbar?:ReactNode}){
 const {i18n}=useTranslation(),copy=auditCopy(i18n.language||'ar');
 const initial=useMemo(()=>{const p=new URLSearchParams(typeof window==='undefined'?'':window.location.search);return Object.fromEntries(INPUT_KEYS.map(key=>[key,p.get(key)??'']));},[]);
 const [draft,setDraft]=useState(initial),[applied,setApplied]=useState(initial);
 const apply=()=>{const p=new URLSearchParams(window.location.search);for(const key of INPUT_KEYS){if(draft[key])p.set(key,draft[key]);else p.delete(key);}p.delete('page');window.history.replaceState(window.history.state,'',window.location.pathname+'?'+p.toString());setApplied({...draft});};
 if(!canRead)return <p role="alert">{copy.denied}</p>;
 const field=(key:typeof INPUT_KEYS[number],label:string)=><label className="grid gap-1 text-xs" key={key}>{label}<input type="text" dir="ltr" placeholder={key==='dateFrom'||key==='dateTo'?'2026-11-21T12:00:00+02:00':undefined} className={CONTROL} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>;
 return <section className="space-y-4"><h1 className="text-2xl font-bold">{copy.title}</h1><p className="text-sm text-muted-foreground">{copy.coverage}</p>{toolbar}<form className="flex flex-wrap items-end gap-2 rounded-lg border p-3" onSubmit={e=>{e.preventDefault();apply();}}>{field('action',copy.action)}{field('actorId',copy.actor)}{field('entityId',copy.entityId)}{field('dateFrom',copy.from)}{field('dateTo',copy.to)}<button type="submit" className={BUTTON}>{copy.apply}</button></form><ListPage key={domain+JSON.stringify(applied)} path="/audit" listId={'audit.register.'+domain} defaultSort="occurredAt:desc" params={{domain,branchId,...Object.fromEntries(Object.entries(applied).filter(([,value])=>value))}} columns={columns(i18n.language||'ar',sourceHref)} filters={(listMetaFor('/audit')?.filters??[]).filter(filter=>filter.param!=='domain').map(filter=>({param:filter.param,label:filter.param==='entityType'?copy.entity:filter.param==='outcome'?copy.outcome:copy.actor,options:filter.values.map(value=>({value,label:value}))}))} getRowId={row=>row.id}/></section>;
}
