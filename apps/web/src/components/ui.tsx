import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

import { cn, initials } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-[var(--field)] disabled:text-[var(--text-muted)]",
  secondary: "bg-[var(--field)] text-[var(--text)] hover:bg-brand-50 dark:hover:bg-ink-soft",
  ghost: "text-[var(--text)] hover:bg-[var(--field)]",
  danger: "bg-danger text-white hover:brightness-95",
};

export const Button = ({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={cn(
      "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold transition-[background,transform,color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed",
      buttonVariants[variant],
      className,
    )}
  >
    {loading ? <Spinner className="size-4" /> : null}
    {children}
  </button>
);

export const IconButton = ({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) => (
  <button
    {...props}
    aria-label={label}
    title={label}
    className={cn(
      "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-[background,transform] duration-150 hover:bg-[var(--field)] active:scale-95",
      className,
    )}
  >
    {children}
  </button>
);

export const Field = ({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined }) => {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={id}
        className={cn("text-sm font-medium", error ? "text-danger" : "text-brand-600 dark:text-brand-400")}
      >
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 border-b bg-transparent text-base outline-none transition-colors placeholder:text-[var(--text-muted)]",
          error ? "border-danger" : "border-[var(--border)] focus:border-brand-500",
        )}
      />
      {error ? <p className="text-right text-xs text-danger">{error}</p> : null}
    </div>
  );
};

export const Spinner = ({ className }: { className?: string }) => (
  <span
    aria-hidden
    className={cn(
      "inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent",
      className,
    )}
  />
);

const avatarPalette = ["#F9C74F", "#E9B8C9", "#B8C9E9", "#C9E9B8", "#E9D8B8", "#D3C4F2"];

export const Avatar = ({
  name,
  src,
  size = 48,
  online,
  className,
}: {
  name: string;
  src?: string | null | undefined;
  size?: number;
  online?: boolean | undefined;
  className?: string;
}) => {
  const color = avatarPalette[(name.charCodeAt(0) || 0) % avatarPalette.length];
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span
          className="flex size-full items-center justify-center rounded-full font-semibold text-ink"
          style={{ background: color, fontSize: size * 0.36 }}
        >
          {initials(name) || "?"}
        </span>
      )}
      {online !== undefined ? (
        <span
          className={cn(
            "absolute right-0.5 bottom-0.5 rounded-full border-2 border-[var(--bg-elevated)]",
            online ? "bg-online" : "bg-[var(--text-muted)]/50",
          )}
          style={{ width: Math.max(10, size * 0.2), height: Math.max(10, size * 0.2) }}
        />
      ) : null}
    </span>
  );
};

export const Dialog = ({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "max-h-[90dvh] w-full overflow-y-auto rounded-t-[2rem] bg-[var(--bg-elevated)] p-6 shadow-2xl sm:max-w-md sm:rounded-[2rem]",
              className,
            )}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mb-5 flex items-center gap-3">
              <IconButton label="Close" onClick={onClose} className="-ml-2">
                <X className="size-5" />
              </IconButton>
              <h2 className="flex-1 text-center text-lg font-semibold">{title}</h2>
              <span className="size-10" />
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export const EmptyState = ({ icon, title, body }: { icon: ReactNode; title: string; body?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center animate-fade-in">
    <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-ink-soft dark:text-brand-400">
      {icon}
    </div>
    <p className="font-semibold">{title}</p>
    {body ? <p className="max-w-xs text-sm text-[var(--text-muted)]">{body}</p> : null}
  </div>
);

export const Underline = ({ children }: { children: ReactNode }) => (
  <span className="relative inline-block">
    <span className="absolute inset-x-0 bottom-0.5 h-2 rounded-sm bg-brand-400/70" />
    <span className="relative">{children}</span>
  </span>
);
