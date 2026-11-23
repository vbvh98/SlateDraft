import React from 'react';
import { Keyboard } from 'lucide-react';
import { Badge, Button, Modal } from './ui';

export interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  label: string;
}

interface ShortcutCategory {
  title: string;
  badge?: string;
  items: ShortcutEntry[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Editing',
    items: [
      { keys: ['Enter'], label: 'New block (auto-advances element)' },
      { keys: ['Tab'], label: 'Cycle element type forward' },
      { keys: ['⇧', 'Tab'], label: 'Cycle element type backward' },
      { keys: ['⌘', 'Z'], label: 'Undo' },
      { keys: ['⇧', '⌘', 'Z'], label: 'Redo' },
      { keys: ['⌘', 'F'], label: 'Find in script' },
      { keys: ['⌥', '⌘', 'F'], label: 'Find & Replace (Ctrl+H on Win)' },
      { keys: ['⇧', '⌘', 'V'], label: 'Smart Paste Intake' },
      { keys: ['Space'], label: 'Phonetic transliterate (Indic mode)' },
    ],
  },
  {
    title: 'Elements',
    badge: '⌘1–⌘8',
    items: [
      { keys: ['⌘', '1'], label: 'Scene Heading (INT. / EXT.)' },
      { keys: ['⌘', '2'], label: 'Action' },
      { keys: ['⌘', '3'], label: 'Character' },
      { keys: ['⌘', '4'], label: 'Parenthetical' },
      { keys: ['⌘', '5'], label: 'Dialogue' },
      { keys: ['⌘', '6'], label: 'Transition' },
      { keys: ['⌘', '7'], label: 'Camera Shot' },
      { keys: ['⌘', '8'], label: 'Song / Lyric' },
    ],
  },
  {
    title: 'File & Save',
    items: [
      { keys: ['⌘', 'S'], label: 'Save Project (.slatedraft)' },
      { keys: ['⌘', 'O'], label: 'Open .slatedraft / .fdx / .fountain' },
      { keys: ['⌘', 'N'], label: 'New Blank Script' },
      { keys: ['⇧', '⌘', 'N'], label: 'New Studio Window' },
      { keys: ['⌘', 'P'], label: 'Print / Export PDF' },
    ],
  },
  {
    title: 'Navigation & Zen Mode',
    items: [
      { keys: ['⌘', 'B'], label: 'Toggle Left Sidebar' },
      { keys: ['⌘', '\\'], label: 'Toggle Zen Writing Mode' },
      { keys: ['⌘', '/'], label: 'Open Keyboard Shortcuts' },
      { keys: ['↑', '↓'], label: 'Seamless inter-block navigation' },
      { keys: ['Esc'], label: 'Exit Zen Mode / Close bar or modal' },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard Shortcuts"
      subtitle="Use ⌘ on macOS or Ctrl on Windows/Linux."
      icon={<Keyboard className="w-4 h-4" />}
      maxWidthClass="max-w-3xl"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SHORTCUT_CATEGORIES.map((category) => (
          <section
            key={category.title}
            className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3.5"
          >
            <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[var(--border-subtle)]">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                {category.title}
              </h4>
              {category.badge && (
                <Badge variant="amber" className="font-mono">
                  {category.badge}
                </Badge>
              )}
            </div>

            <ul className="space-y-2">
              {category.items.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-[var(--text-secondary)] truncate">{item.label}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {item.keys.map((key, idx) => (
                      <kbd
                        key={`${key}-${idx}`}
                        className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] font-mono text-[10px] font-medium text-[var(--text-primary)]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
};
