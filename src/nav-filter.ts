import { hasAnyPermission, type AuthSession } from "./session";

export type NavAnyOfItem = {
  anyOf?: string[];
};

type Linkish = NavAnyOfItem & { type: "link" };
type Sectionish = { type: "section"; children: NavAnyOfItem[] };

/** Hide links/sections whose `anyOf` the session does not hold. */
export function filterNavByAnyOf<T extends Linkish | Sectionish>(entries: T[], session: AuthSession | null): T[] {
  return entries
    .map((entry) => {
      if (entry.type === "link") {
        return !entry.anyOf || hasAnyPermission(session, entry.anyOf) ? entry : null;
      }
      const children = entry.children.filter((child) => !child.anyOf || hasAnyPermission(session, child.anyOf));
      return children.length ? ({ ...entry, children } as T) : null;
    })
    .filter((entry): entry is T => entry != null);
}

/** Longest matching internal path wins. External `href` links are ignored. */
export function matchNavAnyOf(
  pathname: string,
  links: Array<{ to: string; exact?: boolean; anyOf?: string[]; href?: string }>,
): string[] | undefined {
  const match = links
    .filter((link) => !link.href && link.anyOf?.length)
    .filter((link) => {
      if (link.exact || link.to === "/") return pathname === link.to;
      return pathname === link.to || pathname.startsWith(`${link.to}/`);
    })
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.anyOf;
}
