import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { UserDisplay, userDisplayName, userProfileHref } from './user-display';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const id = '00000000-0000-4000-8000-000000000104';
describe('shared UserDisplay', () => {
 it('prefers readable names then email, never opaque IDs', () => {
  expect(userDisplayName({id,name:'  محمد  '},'ar')).toBe('محمد');
  expect(userDisplayName({id,name:id,email:'user@example.invalid'},'en')).toBe('user@example.invalid');
  expect(userDisplayName({id,name:id},'en')).toBe('Unavailable user');
  expect(userDisplayName(null)).toBe('—');
 });
 it('labels service, system, deleted and platform principals', () => {
  expect(userDisplayName({id,type:'SYSTEM'},'en')).toBe('System');
  expect(userDisplayName({id,type:'SERVICE_ACCOUNT'},'ar')).toBe('حساب خدمة غير متاح');
  expect(userDisplayName({id,type:'PLATFORM_USER'},'en')).toBe('Platform operator');
  expect(userDisplayName({id,unavailable:true},'ar')).toBe('مستخدم غير متاح');
 });
 it('requires explicit permission and a real local route for profile links', () => {
  expect(userProfileHref({id},'/admin/users/'+id,true)).toBe('/admin/users/'+id);
  for(const href of ['javascript:alert(1)','//evil.invalid','https://evil.invalid','/\\evil.invalid','/a\nb'])expect(userProfileHref({id},href,true)).toBeUndefined();
  expect(userProfileHref({id},'/account',false)).toBeUndefined();
  expect(userProfileHref({id,unavailable:true},'/account',true)).toBeUndefined();
 });
 it('renders names and safe profile anchors accessibly without HTML injection', async () => {
  const host=document.createElement('div'),root=createRoot(host);
  await act(async()=>root.render(createElement(UserDisplay,{user:{id,name:'<b>محمد</b>'},profileHref:'/account',canViewProfile:true})));
  expect(host.querySelector('a')?.getAttribute('href')).toBe('/account');expect(host.textContent).toBe('<b>محمد</b>');expect(host.querySelector('b')).toBeNull();
  await act(async()=>root.render(createElement(UserDisplay,{user:{id,name:id},profileHref:'/account',locale:'en'})));
  expect(host.querySelector('a')).toBeNull();expect(host.textContent).toBe('Unavailable user');
  await act(async()=>root.unmount());
 });
});
