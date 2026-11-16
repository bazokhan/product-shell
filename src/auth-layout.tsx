import type { ReactNode } from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { setStoredLocale } from "./i18n";

const KEYFRAMES = `@keyframes ps-auth-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.ps-auth-enter{animation:ps-auth-up .55s cubic-bezier(.22,1,.36,1) both}
.ps-auth-d1{animation-delay:.08s}.ps-auth-d2{animation-delay:.16s}
@media (prefers-reduced-motion:reduce){.ps-auth-enter{animation:none}}`;

export function ProductMark({ mark, size = "md" }: { mark: string; size?: "md" | "lg" }) {
  return (
    <span
      className={
        size === "lg"
          ? "grid size-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25"
          : "grid size-10 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-md shadow-primary/20"
      }
      aria-hidden
    >
      {mark}
    </span>
  );
}

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => {
        void i18n.changeLanguage(next);
        setStoredLocale(next);
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 text-sm text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
    >
      <Languages className="size-4" aria-hidden />
      {next === "ar" ? "العربية" : "English"}
    </button>
  );
}

/**
 * The one sign-in frame for the products and the launcher: brand panel + glass card.
 * Colours come from the app's theme tokens, so each product keeps its own accent.
 */
export function AuthLayout({
  mark,
  productName,
  tagline,
  highlights = [],
  aside,
  title,
  description,
  footer,
  children,
}: {
  mark: string;
  productName: string;
  tagline?: string;
  /** Short selling points shown as pills on the brand panel. */
  highlights?: string[];
  /** Replaces the brand panel body (the launcher shows its product list here). */
  aside?: ReactNode;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-foreground lg:flex-row">
      <style>{KEYFRAMES}</style>
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-primary/10 via-transparent via-55% to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none absolute -z-10 size-72 rounded-full bg-primary/20 blur-3xl start-[6%] top-[8%]" aria-hidden />
      <div className="pointer-events-none absolute -z-10 size-56 rounded-full bg-primary/10 blur-3xl end-[10%] bottom-[14%]" aria-hidden />

      <aside className="relative hidden w-full flex-col justify-between p-10 lg:flex lg:w-[44%] xl:w-[42%]">
        <div className="flex items-center gap-3">
          <ProductMark mark={mark} />
          <span className="text-xl font-bold tracking-tight">{productName}</span>
        </div>
        <div className="ps-auth-enter max-w-md space-y-5">
          {aside ?? (
            <>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">{productName}</h1>
              {tagline ? <p className="text-lg leading-relaxed text-muted-foreground">{tagline}</p> : null}
              {highlights.length > 0 ? (
                <ul className="flex flex-wrap gap-2.5 pt-1">
                  {highlights.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-border/70 bg-card/60 px-4 py-2.5 text-sm text-foreground shadow-sm backdrop-blur-xl"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {productName}</p>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 p-4 sm:p-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <ProductMark mark={mark} />
            <span className="text-lg font-bold">{productName}</span>
          </div>
          <div className="ms-auto">
            <LanguageToggle />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-6">
          <div className="ps-auth-enter w-full max-w-[420px] rounded-3xl border border-border/70 bg-card/75 p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:p-8">
            <div className="ps-auth-enter ps-auth-d1 mb-6 space-y-1.5">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
            </div>
            <div className="ps-auth-enter ps-auth-d2">{children}</div>
            {footer ? (
              <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
