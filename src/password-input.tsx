import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "./cn";

/** Shared field look for the auth screens (44px, soft focus ring, invalid state). */
export const authInputClass =
  "block w-full min-h-11 rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-[0.9375rem] text-foreground shadow-xs transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground hover:bg-background focus:border-primary focus:bg-background focus:outline-none focus:ring-3 focus:ring-primary/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 disabled:opacity-60";

export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const label = visible ? t("auth.hidePassword") : t("auth.showPassword");
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={cn(authInputClass, "pe-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-e-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        aria-label={label}
        aria-pressed={visible}
        title={label}
      >
        {visible ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
      </button>
    </div>
  );
}
