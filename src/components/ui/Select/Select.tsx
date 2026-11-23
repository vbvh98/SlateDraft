import React, { useId } from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  label?: string;
  leftIcon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  size?: 'xs' | 'sm';
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  label,
  leftIcon,
  ariaLabel,
  className = '',
  size = 'sm',
}: SelectProps<T>): React.ReactElement {
  const selectId = useId();
  const padClass = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1"
        >
          {label}
        </label>
      )}
      <div
        className={`inline-flex items-center gap-1.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md w-full focus-within:ring-2 focus-within:ring-amber-500/60 focus-within:border-[var(--accent)] transition-colors ${padClass}`}
      >
        {leftIcon && <span className="shrink-0 text-[var(--accent-text)]">{leftIcon}</span>}
        <select
          id={selectId}
          aria-label={ariaLabel ?? label}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="bg-transparent text-[var(--text-primary)] focus-visible:outline-none cursor-pointer w-full"
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
