import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  className = '',
}: TabsProps<T>): React.ReactElement {
  return (
    <nav
      role="tablist"
      className={`inline-flex items-center bg-[var(--bg-input)] p-0.5 rounded-lg border border-[var(--border-subtle)] select-none ${className}`}
    >
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
              active
                ? 'bg-[var(--accent)] text-[var(--accent-on)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
