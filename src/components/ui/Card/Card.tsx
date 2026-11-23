import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  interactive = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] ${
        interactive
          ? 'hover:border-[var(--accent-border)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
  children?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  highlight = false,
  children,
}) => {
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
        <span>{label}</span>
        {icon && <span className="text-[var(--accent-text)]">{icon}</span>}
      </div>
      <div
        className={`text-2xl font-bold font-mono mt-1 ${
          highlight ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </div>
      {subtext && <div className="text-[11px] text-[var(--text-muted)] mt-1">{subtext}</div>}
      {children}
    </Card>
  );
};
