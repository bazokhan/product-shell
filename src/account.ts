import { customFetch } from "./custom-fetch";

export const MIN_NEW_PASSWORD_LENGTH = 12;

export type NewPasswordIssue = "short" | "mismatch";

export function newPasswordIssue(newPassword: string, confirm: string): NewPasswordIssue | null {
  if (newPassword.length < MIN_NEW_PASSWORD_LENGTH) return "short";
  if (newPassword !== confirm) return "mismatch";
  return null;
}

export async function submitChangePassword(
  currentPassword: string,
  newPassword: string,
  confirm: string,
): Promise<{ ok: true } | { ok: false; issue: NewPasswordIssue }> {
  const issue = newPasswordIssue(newPassword, confirm);
  if (issue) return { ok: false, issue };
  await customFetch("/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return { ok: true };
}
