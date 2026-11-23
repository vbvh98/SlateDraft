import React from 'react';

export interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
}) => {
  return (
    <div className="px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          {icon && <span className="text-[var(--accent-text)] shrink-0">{icon}</span>}
          <span>{title}</span>
        </h2>
        {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
