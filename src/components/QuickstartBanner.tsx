import React, { useState } from 'react';
import { CalendarDays, Keyboard, LayoutTemplate, Sparkles, X } from 'lucide-react';

export interface QuickstartBannerProps {
  onOpenTemplates: () => void;
  onOpenProduction: () => void;
  onOpenShortcuts: () => void;
}

const STORAGE_KEY = 'slatedraft-quickstart-dismissed';

function readDismissed(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const QuickstartBanner: React.FC<QuickstartBannerProps> = ({
  onOpenTemplates,
  onOpenProduction,
  onOpenShortcuts,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      }
    } catch {
      // Ignore storage errors in private/restricted environments
    }
  };

  return (
    <div
      role="region"
      aria-label="SlateDraft Studio Quickstart"
      className="no-print shrink-0 px-3 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-text)] shrink-0">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
          </span>
          <span className="text-xs font-medium text-[var(--text-primary)] truncate">
            Quickstart
          </span>
          <span className="hidden md:inline text-xs text-[var(--text-muted)] truncate">
            Jump into a cinema template, schedule your stripboard, or view shortcuts.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenTemplates}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[var(--accent-text)]" aria-hidden="true" />
            <span>Pick a Template</span>
          </button>

          <button
            type="button"
            onClick={onOpenProduction}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[var(--accent-text)]" aria-hidden="true" />
            <span>Auto-Schedule Stripboard</span>
          </button>

          <button
            type="button"
            onClick={onOpenShortcuts}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-[var(--accent-text)]" aria-hidden="true" />
            <span>Keyboard Shortcuts</span>
            <kbd className="ml-0.5 px-1 py-0.25 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-secondary)]">
              ⌘/
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss quickstart bar"
            title="Dismiss"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
