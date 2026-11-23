import React, { useEffect, useRef } from 'react';
import {
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  Replace,
  ReplaceAll,
  Search,
  X,
} from 'lucide-react';
import { ElementType, ScriptBlock } from '../types/screenplay';
import { Button, IconButton } from './ui';

export type FindElementFilter = 'all' | 'scene-heading' | 'character' | 'dialogue' | 'action';

export interface FindMatch {
  blockId: string;
  blockIndex: number;
  start: number;
  end: number;
}

export function computeFindMatches(
  blocks: ScriptBlock[],
  query: string,
  matchCase: boolean,
  elementFilter: FindElementFilter
): FindMatch[] {
  if (!query) return [];
  const needle = matchCase ? query : query.toLowerCase();
  const needleLen = needle.length;
  if (needleLen === 0) return [];

  const matches: FindMatch[] = [];

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    if (elementFilter !== 'all' && block.elementType !== (elementFilter as ElementType)) {
      continue;
    }

    const haystack = matchCase ? block.text : block.text.toLowerCase();
    let searchFrom = 0;
    while (searchFrom <= haystack.length - needleLen) {
      const idx = haystack.indexOf(needle, searchFrom);
      if (idx === -1) break;
      matches.push({
        blockId: block.id,
        blockIndex,
        start: idx,
        end: idx + needleLen,
      });
      searchFrom = idx + needleLen;
    }
  }

  return matches;
}

export interface FindReplaceBarProps {
  open: boolean;
  focusTarget?: 'find' | 'replace';
  query: string;
  replaceText: string;
  matchCase: boolean;
  elementFilter: FindElementFilter;
  matchCount: number;
  activeMatchIndex: number;
  onQueryChange: (value: string) => void;
  onReplaceTextChange: (value: string) => void;
  onToggleMatchCase: () => void;
  onElementFilterChange: (filter: FindElementFilter) => void;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

const FILTER_OPTIONS: Array<{ value: FindElementFilter; label: string }> = [
  { value: 'all', label: 'All Elements' },
  { value: 'scene-heading', label: 'Scene Heading' },
  { value: 'character', label: 'Character' },
  { value: 'dialogue', label: 'Dialogue' },
  { value: 'action', label: 'Action' },
];

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  open,
  focusTarget = 'find',
  query,
  replaceText,
  matchCase,
  elementFilter,
  matchCount,
  activeMatchIndex,
  onQueryChange,
  onReplaceTextChange,
  onToggleMatchCase,
  onElementFilterChange,
  onPrevMatch,
  onNextMatch,
  onReplaceCurrent,
  onReplaceAll,
  onClose,
}) => {
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const target = focusTarget === 'replace' && query ? replaceInputRef.current : findInputRef.current;
    if (target) {
      target.focus();
      target.select();
    }
  }, [open, focusTarget]);

  if (!open) return null;

  const handleBarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const matchLabel =
    !query
      ? 'Type to find'
      : matchCount === 0
        ? '0 matches'
        : `${activeMatchIndex + 1} of ${matchCount}`;

  return (
    <div
      role="search"
      aria-label="Find and Replace"
      onKeyDown={handleBarKeyDown}
      className="no-print border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 flex flex-col gap-2 text-xs z-30 shadow-sm transition-colors"
    >
      {/* Row 1: Find input, Match Case, Element filter, Counter, Prev/Next, Close */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex items-center flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
          <input
            ref={findInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  onPrevMatch();
                } else {
                  onNextMatch();
                }
              }
            }}
            placeholder="Find in script..."
            aria-label="Find text"
            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md pl-8 pr-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus:border-[var(--accent)]"
          />
        </div>

        <Button
          variant="secondary"
          size="xs"
          active={matchCase}
          onClick={onToggleMatchCase}
          leftIcon={<CaseSensitive className="w-3.5 h-3.5" />}
          title="Match Case"
          aria-pressed={matchCase}
        >
          Aa
        </Button>

        <select
          aria-label="Filter by element type"
          value={elementFilter}
          onChange={(e) => onElementFilterChange(e.target.value as FindElementFilter)}
          className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-xs text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus:border-[var(--accent)] cursor-pointer"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span
          aria-live="polite"
          className="font-mono text-[11px] text-[var(--text-muted)] min-w-[74px] text-center select-none"
        >
          {matchLabel}
        </span>

        <div className="flex items-center border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface-2)] overflow-hidden">
          <IconButton
            size="xs"
            disabled={matchCount === 0}
            icon={<ChevronUp className="w-3.5 h-3.5" />}
            onClick={onPrevMatch}
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          />
          <span className="w-[1px] h-3.5 bg-[var(--border-subtle)]" />
          <IconButton
            size="xs"
            disabled={matchCount === 0}
            icon={<ChevronDown className="w-3.5 h-3.5" />}
            onClick={onNextMatch}
            title="Next match (Enter)"
            aria-label="Next match"
          />
        </div>

        <div className="ml-auto">
          <IconButton
            size="xs"
            icon={<X className="w-3.5 h-3.5" />}
            onClick={onClose}
            title="Close Find & Replace (Esc)"
            aria-label="Close Find and Replace"
          />
        </div>
      </div>

      {/* Row 2: Replace input, Replace, Replace All */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex items-center flex-1 min-w-[200px] max-w-sm">
          <Replace className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
          <input
            ref={replaceInputRef}
            type="text"
            value={replaceText}
            onChange={(e) => onReplaceTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matchCount > 0) {
                e.preventDefault();
                onReplaceCurrent();
              }
            }}
            placeholder="Replace with..."
            aria-label="Replace text"
            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md pl-8 pr-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus:border-[var(--accent)]"
          />
        </div>

        <Button
          variant="secondary"
          size="xs"
          disabled={matchCount === 0}
          leftIcon={<Replace className="w-3 h-3" />}
          onClick={onReplaceCurrent}
          title="Replace current match"
        >
          Replace
        </Button>

        <Button
          variant="amber-soft"
          size="xs"
          disabled={matchCount === 0}
          leftIcon={<ReplaceAll className="w-3 h-3" />}
          onClick={onReplaceAll}
          title="Replace all matches"
        >
          Replace All
        </Button>
      </div>
    </div>
  );
};
