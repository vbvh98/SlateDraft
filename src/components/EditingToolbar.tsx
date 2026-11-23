import React, { useEffect, useRef, useState } from 'react';
import {
  AlignLeft,
  ArrowRightCircle,
  Bookmark,
  Camera,
  ChevronDown,
  ClipboardPaste,
  Columns,
  CornerDownLeft,
  Film,
  HelpCircle,
  Languages,
  MessageSquare,
  Music,
  Redo,
  Sparkles,
  StickyNote,
  Undo,
  User,
  X,
} from 'lucide-react';
import { ElementType, IndicLanguage } from '../types/screenplay';
import { LANGUAGE_METADATA } from '../services/transliterationEngine';
import { Button, IconButton } from './ui';

export interface EditingToolbarProps {
  activeElementType: ElementType;
  onChangeElementType: (type: ElementType) => void;
  language: IndicLanguage;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onQuickCorrectWord?: () => void;
  onToggleDualDialogue?: () => void;
  isDualDialogue?: boolean;
  onOpenSmartPaste?: () => void;
}

export const EditingToolbar: React.FC<EditingToolbarProps> = ({
  activeElementType,
  onChangeElementType,
  language,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleDualDialogue,
  isDualDialogue,
  onOpenSmartPaste,
}) => {
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [elementDropdownOpen, setElementDropdownOpen] = useState(false);

  const elementDropdownRef = useRef<HTMLDivElement>(null);
  const cheatSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementDropdownOpen && !cheatSheetOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        elementDropdownOpen &&
        elementDropdownRef.current &&
        !elementDropdownRef.current.contains(target)
      ) {
        setElementDropdownOpen(false);
      }
      if (
        cheatSheetOpen &&
        cheatSheetRef.current &&
        !cheatSheetRef.current.contains(target)
      ) {
        setCheatSheetOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setElementDropdownOpen(false);
        setCheatSheetOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [elementDropdownOpen, cheatSheetOpen]);

  const elementItems: Array<{
    type: ElementType;
    label: string;
    key: string;
    next: string;
    icon: React.ReactNode;
  }> = [
    { type: 'scene-heading', label: 'Scene Heading', key: '⌘1', next: 'Action', icon: <Film className="w-3.5 h-3.5" /> },
    { type: 'action', label: 'Action', key: '⌘2', next: 'Action', icon: <AlignLeft className="w-3.5 h-3.5" /> },
    { type: 'character', label: 'Character', key: '⌘3', next: 'Dialogue', icon: <User className="w-3.5 h-3.5" /> },
    { type: 'parenthetical', label: 'Parenthetical', key: '⌘4', next: 'Dialogue', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { type: 'dialogue', label: 'Dialogue', key: '⌘5', next: 'Character / Action', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { type: 'transition', label: 'Transition', key: '⌘6', next: 'Scene Heading', icon: <ArrowRightCircle className="w-3.5 h-3.5" /> },
    { type: 'shot', label: 'Camera Shot', key: '⌘7', next: 'Action', icon: <Camera className="w-3.5 h-3.5" /> },
    { type: 'song-lyric', label: 'Song / Lyric', key: '⌘8', next: 'Song / Lyric', icon: <Music className="w-3.5 h-3.5" /> },
    { type: 'section-act', label: 'Act / Section', key: 'Tab', next: 'Scene Heading', icon: <Bookmark className="w-3.5 h-3.5" /> },
    { type: 'note', label: 'Script Note', key: 'Tab', next: 'Action', icon: <StickyNote className="w-3.5 h-3.5" /> },
  ];

  const currentMeta = elementItems.find((e) => e.type === activeElementType) ?? elementItems[0];
  const langMeta = LANGUAGE_METADATA[language];

  return (
    <div className="no-print relative border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs select-none z-20 transition-colors">
      {/* Left: Quick Undo/Redo + Current Element Switcher Pill */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface-2)] overflow-hidden">
          <IconButton
            size="xs"
            disabled={!canUndo}
            icon={<Undo className="w-3.5 h-3.5" />}
            onClick={onUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
          />
          <span className="w-[1px] h-3.5 bg-[var(--border-subtle)]" />
          <IconButton
            size="xs"
            disabled={!canRedo}
            icon={<Redo className="w-3.5 h-3.5" />}
            onClick={onRedo}
            title="Redo (⇧⌘Z)"
            aria-label="Redo"
          />
        </div>

        {/* Current Active Element Selector Dropdown */}
        <div className="relative" ref={elementDropdownRef}>
          <button
            type="button"
            aria-expanded={elementDropdownOpen}
            aria-haspopup="listbox"
            onClick={() => {
              setElementDropdownOpen((prev) => !prev);
              setCheatSheetOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-text)] font-medium hover:brightness-105 active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
          >
            {currentMeta.icon}
            <span className="font-semibold text-[11px] uppercase tracking-wide">
              {currentMeta.label}
            </span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {elementDropdownOpen && (
            <div
              role="listbox"
              aria-label="Screenplay element type"
              className="animate-studio-pop absolute top-full left-0 mt-1.5 w-52 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-2xl py-1 z-50 text-xs"
            >
              <div className="px-2.5 py-1 text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">
                Block Element (Tab / ⌘1–8)
              </div>
              {elementItems.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  role="option"
                  aria-selected={activeElementType === item.type}
                  onClick={() => {
                    onChangeElementType(item.type);
                    setElementDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeElementType === item.type
                      ? 'text-[var(--accent)] bg-[var(--accent-soft)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  <kbd className="text-[10px] font-mono text-[var(--text-muted)]">{item.key}</kbd>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Next Element Flow Hint (quiet inline hint on wide screens) */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono pl-1">
          <CornerDownLeft className="w-3 h-3 text-[var(--accent-text)]" />
          <span>{currentMeta.next}</span>
          <span className="opacity-40">·</span>
          <span>Tab cycle</span>
        </div>

        {/* Dual Dialogue Quick Toggle when editing Dialogue or Character */}
        {(activeElementType === 'character' || activeElementType === 'dialogue') && onToggleDualDialogue && (
          <Button
            variant={isDualDialogue ? 'amber-soft' : 'outline'}
            size="xs"
            leftIcon={<Columns className="w-3 h-3" />}
            onClick={onToggleDualDialogue}
            title="Toggle Dual Dialogue (Side-by-Side speeches)"
          >
            {isDualDialogue ? 'Dual Active' : 'Dual Dialogue'}
          </Button>
        )}
      </div>

      {/* Right: Phonetic Indicator, Smart Paste, & Shortcut Guide */}
      <div className="flex items-center gap-2">
        {language !== 'english' && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
            <Languages className="w-3 h-3 text-[var(--accent)] shrink-0" />
            <span>
              Phonetic <strong className="text-[var(--text-primary)]">{langMeta.label}</strong>{' '}
              <kbd className="px-1 py-0.2 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">
                Space
              </kbd>
            </span>
          </div>
        )}

        {onOpenSmartPaste && (
          <Button
            data-trigger-smart-paste="true"
            variant="secondary"
            size="xs"
            leftIcon={<ClipboardPaste className="w-3 h-3 text-[var(--accent)]" />}
            onClick={onOpenSmartPaste}
            title="Smart Paste Intake (⇧⌘V): Paste raw text or Fountain script and auto-format into screenplay blocks"
          >
            Smart Paste
          </Button>
        )}

        <div className="relative" ref={cheatSheetRef}>
          <Button
            variant="outline"
            size="xs"
            active={cheatSheetOpen}
            aria-expanded={cheatSheetOpen}
            aria-haspopup="dialog"
            leftIcon={<HelpCircle className="w-3 h-3 text-[var(--accent)]" />}
            onClick={() => {
              setCheatSheetOpen((prev) => !prev);
              setElementDropdownOpen(false);
            }}
            title="Open Screenplay Keyboard Traversal & Correction Cheat Sheet"
          >
            Shortcuts
          </Button>

          {/* Floating Interactive Keyboard Shortcut Cheat Sheet */}
          {cheatSheetOpen && (
            <div
              role="dialog"
              aria-label="Screenplay keyboard shortcuts"
              className="animate-studio-pop absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-2xl p-4 z-50 text-[var(--text-primary)] space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                    Screenplay Choreography & Quick Corrections
                  </h4>
                </div>
                <IconButton
                  size="xs"
                  icon={<X className="w-3.5 h-3.5" />}
                  onClick={() => setCheatSheetOpen(false)}
                  aria-label="Close shortcuts guide"
                />
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]">
                    <span className="font-semibold text-[var(--accent)] block mb-0.5">Tab / ⇧Tab</span>
                    <span className="text-[var(--text-secondary)]">Cycle block element forward or backward</span>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]">
                    <span className="font-semibold text-[var(--accent)] block mb-0.5">Enter</span>
                    <span className="text-[var(--text-secondary)]">Next element (empty Dialogue/Character → Action)</span>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]">
                    <span className="font-semibold text-[var(--accent)] block mb-0.5">↑ / ↓ Arrows</span>
                    <span className="text-[var(--text-secondary)]">Move seamlessly between adjacent script blocks</span>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]">
                    <span className="font-semibold text-[var(--accent)] block mb-0.5">Shift + Enter</span>
                    <span className="text-[var(--text-secondary)]">Insert clean line break inside current block</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] space-y-1">
                  <span className="font-semibold text-[var(--text-primary)] block text-[11px]">
                    Quick Error Correction & Transliteration:
                  </span>
                  <ul className="text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                    <li>
                      <strong className="text-[var(--text-primary)]">Undo / Redo:</strong>{' '}
                      <kbd className="font-mono text-[var(--text-primary)]">⌘Z</kbd> /{' '}
                      <kbd className="font-mono text-[var(--text-primary)]">⇧⌘Z</kbd>
                    </li>
                    <li>
                      <strong className="text-[var(--text-primary)]">Smart Paste:</strong>{' '}
                      <kbd className="font-mono text-[var(--text-primary)]">⇧⌘V</kbd> to auto-parse raw text or Fountain
                    </li>
                    <li>
                      <strong className="text-[var(--text-primary)]">Phonetic Candidates:</strong> Press{' '}
                      <kbd className="font-mono text-[var(--text-primary)]">1–4</kbd> to pick or{' '}
                      <kbd className="font-mono text-[var(--text-primary)]">Esc</kbd> to dismiss
                    </li>
                    <li>
                      <strong className="text-[var(--text-primary)]">Format Switch:</strong>{' '}
                      <kbd className="font-mono text-[var(--text-primary)]">⌘1</kbd>–
                      <kbd className="font-mono text-[var(--text-primary)]">⌘8</kbd> or click the element pill
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
