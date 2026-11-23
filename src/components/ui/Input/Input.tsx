import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  mono?: boolean;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  leftIcon,
  mono = false,
  className = '',
  containerClassName = '',
  id,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="text-[var(--text-muted)] absolute left-2.5 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus:border-[var(--accent)] transition-colors ${
            leftIcon ? 'pl-8 pr-2.5' : 'px-2.5'
          } ${mono ? 'font-mono' : ''} ${className}`}
          {...rest}
        />
      </div>
    </div>
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  mono?: boolean;
  scriptFont?: boolean;
  containerClassName?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  mono = false,
  scriptFont = false,
  className = '',
  containerClassName = '',
  id,
  ...rest
}) => {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus:border-[var(--accent)] transition-colors ${
          mono ? 'font-mono' : ''
        } ${scriptFont ? 'font-script text-sm' : ''} ${className}`}
        {...rest}
      />
    </div>
  );
};
