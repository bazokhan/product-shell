import { hasAnyPermission, type AuthSession } from "./session";

export type NavAnyOfItem = {
  anyOf?: string[];
};

export type FilterableNavLink = NavAnyOfItem & {
  type: "link";
};

export type FilterableNavSection<TChild extends NavAnyOfItem> = {
  type: "section";
  children: TChild[];
};

/** Hide links/sections whose `anyOf` the session does not hold. */
export function filterNavByAnyOf<TLink extends FilterableNavLink, TChild extends NavAnyOfItem, TSection extends FilterableNavSection<TChild>>(
  entries: Array<TLink | TSection>,
  session: AuthSession | null,
): Array<TLink | TSection> {
  return entries
    .map((entry) => {
      if (entry.type === "link") {
        return !entry.anyOf || hasAnyPermission(session, entry.anyOf) ? entry : null;
      }
      const children = entry.children.filter((child) => !child.anyOf || hasAnyPermission(session, child.anyOf));
      return children.length ? ({ ...entry, children } as TSection) : null;
    })
    .filter((entry): entry is TLink | TSection => entry != null);
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
