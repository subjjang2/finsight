import React, {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

type Variant = "primary" | "accent" | "text";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-lg border border-line bg-surface p-6 text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    primary: "bg-white text-black hover:bg-neutral-200",
    accent: "bg-accent text-black hover:bg-accent/90",
    text: "bg-transparent px-0 text-muted hover:text-neutral-300",
  };

  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-accent focus:bg-surface focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cx(
          "w-full appearance-none rounded-lg border border-line bg-surface-2 px-4 py-3 pr-10 text-sm text-ink outline-none transition-colors focus:border-accent focus:bg-surface focus-visible:ring-2 focus-visible:ring-accent",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-lg bg-surface-3 px-2.5 py-1 text-xs font-medium text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Stat({
  label,
  value,
  helper,
  className,
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx("space-y-2", className)}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <div className="text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {helper ? <p className="text-xs text-muted">{helper}</p> : null}
    </Card>
  );
}

function StateIcon({ kind }: { kind: "loading" | "error" | "empty" | "success" }) {
  if (kind === "loading") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-accent"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path d="M12 3a9 9 0 1 1-9 9" />
      </svg>
    );
  }

  const paths = {
    error: <path d="M12 8v5m0 4h.01M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />,
    empty: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm4 4h8M8 14h5" />,
    success: <path d="M20 6 9 17l-5-5" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={cx("h-5 w-5", kind === "error" ? "text-error" : "text-accent")}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      {paths[kind]}
    </svg>
  );
}

function StateCard({
  kind,
  title,
  message,
  label,
}: {
  kind: "loading" | "error" | "empty" | "success";
  title?: string;
  message?: string;
  label?: string;
}) {
  return (
    <Card className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
      <StateIcon kind={kind} />
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title ?? label}</p>
        {message ? (
          <p className="max-w-sm text-sm leading-relaxed text-muted">{message}</p>
        ) : null}
      </div>
    </Card>
  );
}

export function LoadingState({ label = "불러오는 중" }: { label?: string }) {
  return <StateCard kind="loading" label={label} />;
}

export function ErrorState({
  title = "오류가 발생했습니다",
  message = "잠시 후 다시 시도해 주세요.",
}: {
  title?: string;
  message?: string;
}) {
  return <StateCard kind="error" title={title} message={message} />;
}

export function EmptyState({
  title = "데이터가 없습니다",
  message = "CSV를 업로드하면 분석 결과가 여기에 표시됩니다.",
}: {
  title?: string;
  message?: string;
}) {
  return <StateCard kind="empty" title={title} message={message} />;
}

export function SuccessState({
  title = "완료",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return <StateCard kind="success" title={title} message={message} />;
}
