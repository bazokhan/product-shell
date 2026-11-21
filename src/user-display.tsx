import { i18n } from './i18n';

/** A display reference, never an authority grant or a reason to fetch another user's profile. */
export type UserReference = {
  id?: string | null;
  type?: string | null;
  name?: string | null;
  email?: string | null;
  unavailable?: boolean;
};
const opaqueId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function userDisplayName(user?: UserReference | null, locale = i18n.language): string {
  if (!user) return '—';
  const ar = !locale || locale.startsWith('ar');
  const name = user.name?.trim();
  if (name && name !== user.id && !opaqueId.test(name)) return name;
  if (user.email?.trim()) return user.email.trim();
  if (user.type === 'SYSTEM') return ar ? 'النظام' : 'System';
  if (user.type === 'SERVICE_ACCOUNT') return ar ? 'حساب خدمة غير متاح' : 'Unavailable service account';
  if (user.type === 'PLATFORM_USER') return ar ? 'مشغل المنصة' : 'Platform operator';
  return ar ? 'مستخدم غير متاح' : 'Unavailable user';
}
/** Host supplies a real route only after checking its own permission. No guessed profile URLs. */
export function userProfileHref(user: UserReference | null | undefined, href?: string, canViewProfile = false): string | undefined {
  if (!user?.id || user.unavailable || !canViewProfile || !href) return undefined;
  if (!href.startsWith('/') || href.startsWith('//') || (href.includes('\\') || [...href].some(char => char.charCodeAt(0) <= 32))) return undefined;
  return href;
}
export function UserDisplay({ user, profileHref, canViewProfile = false, className, locale }: {
  user?: UserReference | null;
  profileHref?: string;
  canViewProfile?: boolean;
  className?: string;
  locale?: string;
}) {
  const label = userDisplayName(user, locale);
  const href = userProfileHref(user, profileHref, canViewProfile);
  return href ? <a href={href} className={className} dir="auto">{label}</a> : <span className={className} dir="auto">{label}</span>;
}
