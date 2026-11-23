import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidthClass?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  maxWidthClass = 'max-w-2xl',
  footer,
  children,
}) => {
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[var(--backdrop)] backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={`bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl w-full ${maxWidthClass} text-[var(--text-primary)] shadow-[var(--shadow-modal)] flex flex-col max-h-[90vh] overflow-hidden`}
      >
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-[var(--accent-text)] shrink-0">{icon}</span>}
            <div className="min-w-0">
              <h3 id={titleId} className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {title}
              </h3>
              {subtitle && (
                <p id={subtitleId} className="text-[11px] text-[var(--text-secondary)]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <IconButton
            icon={<X className="w-4 h-4" />}
            onClick={onClose}
            aria-label="Close modal"
          />
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
