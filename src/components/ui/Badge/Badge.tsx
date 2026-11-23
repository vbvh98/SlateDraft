import React from 'react';

export type BadgeVariant =
  | 'amber'
  | 'stone'
  | 'emerald'
  | 'rose'
  | 'sky'
  | 'purple'
  | 'red'
  | 'orange'
  | 'outline';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  mono?: boolean;
  uppercase?: boolean;
  className?: string;
  onRemove?: () => void;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  amber:
    'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border-[var(--badge-amber-border)]',
  stone:
    'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  emerald:
    'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border-[var(--badge-emerald-border)]',
  rose:
    'bg-[var(--badge-rose-bg)] text-[var(--badge-rose-text)] border-[var(--badge-rose-border)]',
  sky:
    'bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] border-[var(--badge-sky-border)]',
  purple:
    'bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)] border-[var(--badge-purple-border)]',
  red:
    'bg-[var(--badge-red-bg)] text-[var(--badge-red-text)] border-[var(--badge-red-border)]',
  orange:
    'bg-[var(--badge-orange-bg)] text-[var(--badge-orange-text)] border-[var(--badge-orange-border)]',
  outline:
    'bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)]',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'stone',
  mono = false,
  uppercase = false,
  className = '',
  onRemove,
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${
        BADGE_VARIANTS[variant]
      } ${mono ? 'font-mono' : ''} ${uppercase ? 'uppercase tracking-wider text-[10px]' : ''} ${className}`}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove tag"
          className="ml-0.5 opacity-70 hover:opacity-100 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
        >
          ×
        </button>
      )}
    </span>
  );
};
