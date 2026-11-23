import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'amber-soft'
  | 'danger'
  | 'outline';

export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  active?: boolean;
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-on)] font-semibold border border-transparent shadow-xs',
  secondary:
    'bg-[var(--bg-surface-2)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
  ghost:
    'bg-transparent hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent',
  'amber-soft':
    'bg-[var(--accent-soft)] hover:bg-amber-500/20 text-[var(--accent-text)] border border-[var(--accent-border)] font-medium',
  danger:
    'bg-[var(--danger-soft)] hover:bg-[var(--danger-soft-hover)] text-[var(--danger-text)] border border-[var(--danger-border)]',
  outline:
    'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-border)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'px-2 py-0.5 text-[11px] rounded gap-1',
  sm: 'px-2.5 py-1 text-xs rounded-md gap-1.5',
  md: 'px-3.5 py-1.5 text-xs rounded-lg gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  leftIcon,
  rightIcon,
  active = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const activeOverride = active
    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent-border)] ring-1 ring-amber-500/30'
    : VARIANT_CLASSES[variant];

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center transition-all select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${FOCUS_RING} ${SIZE_CLASSES[size]} ${activeOverride} ${className}`}
      {...rest}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children && <span className="truncate">{children}</span>}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  active?: boolean;
  variant?: 'ghost' | 'secondary' | 'danger' | 'amber-soft';
  size?: 'xs' | 'sm';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  active = false,
  variant = 'ghost',
  size = 'sm',
  className = '',
  type = 'button',
  ...rest
}) => {
  const sizeCls = size === 'xs' ? 'p-1 rounded' : 'p-1.5 rounded-md';
  const variantCls = active
    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent-border)]'
    : variant === 'danger'
      ? 'hover:bg-[var(--danger-soft-hover)] text-[var(--text-secondary)] hover:text-[var(--danger-text)]'
      : variant === 'amber-soft'
        ? 'bg-[var(--accent-soft)] hover:bg-amber-500/20 text-[var(--accent-text)]'
        : variant === 'secondary'
          ? 'bg-[var(--bg-surface-2)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
          : 'hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]';

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center transition-colors select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${FOCUS_RING} ${sizeCls} ${variantCls} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
};
