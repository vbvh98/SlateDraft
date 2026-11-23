import React, { useMemo, useState } from 'react';
import {
  AlignLeft,
  ArrowRightCircle,
  Camera,
  ChevronDown,
  Film,
  Flag,
  Lock,
  MessageSquare,
  Music,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { ElementType, ScriptBlock } from '../types/screenplay';
import { NAVARASA_META } from '../services/analyticsEngine';
import { REVISION_COLORS } from './Titlebar';
import { Badge, Button, Input } from './ui';

export interface SidebarLeftProps {
  blocks: ScriptBlock[];
  activeBlockId: string | null;
  activeElementType: ElementType;
  onSelectElementType: (type: ElementType) => void;
  onJumpToBlock: (blockId: string) => void;
  onAddNewScene: () => void;
  onAddIntervalMarker: () => void;
}

export const ELEMENT_SWITCHER_ITEMS: Array<{
  type: ElementType;
  label: string;
  shortLabel: string;
  shortcut: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'scene-heading',
    label: 'Scene Heading',
    shortLabel: 'Scene',
    shortcut: '⌘1',
    icon: <Film className="w-3.5 h-3.5" />,
  },
  {
    type: 'action',
    label: 'Action',
    shortLabel: 'Action',
    shortcut: '⌘2',
    icon: <AlignLeft className="w-3.5 h-3.5" />,
  },
  {
    type: 'character',
    label: 'Character',
    shortLabel: 'Character',
    shortcut: '⌘3',
    icon: <User className="w-3.5 h-3.5" />,
  },
  {
    type: 'parenthetical',
    label: 'Parenthetical',
    shortLabel: 'Paren.',
    shortcut: '⌘4',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  {
    type: 'dialogue',
    label: 'Dialogue',
    shortLabel: 'Dialogue',
    shortcut: '⌘5',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  {
    type: 'transition',
    label: 'Transition',
    shortLabel: 'Transition',
    shortcut: '⌘6',
    icon: <ArrowRightCircle className="w-3.5 h-3.5" />,
  },
  {
    type: 'shot',
    label: 'Camera Shot',
    shortLabel: 'Shot',
    shortcut: '⌘7',
    icon: <Camera className="w-3.5 h-3.5" />,
  },
  {
    type: 'song-lyric',
    label: 'Song / Lyric',
    shortLabel: 'Lyric',
    shortcut: '⌘8',
    icon: <Music className="w-3.5 h-3.5" />,
  },
];

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  blocks,
  activeBlockId,
  activeElementType,
  onSelectElementType,
  onJumpToBlock,
  onAddNewScene,
  onAddIntervalMarker,
}) => {
  const [sceneFilter, setSceneFilter] = useState('');
  const [paletteExpanded, setPaletteExpanded] = useState(false);

  const sceneCount = useMemo(
    () => blocks.filter((b) => b.elementType === 'scene-heading').length,
    [blocks]
  );

  const outlineItems = useMemo(
    () => blocks.filter((b) => b.elementType === 'scene-heading' || b.elementType === 'section-act'),
    [blocks]
  );

  // Compute the containing scene heading ID for activeBlockId by scanning backwards
  const activeSceneId = useMemo(() => {
    if (!activeBlockId) return null;
    const activeIdx = blocks.findIndex((b) => b.id === activeBlockId);
    if (activeIdx === -1) return null;

    if (blocks[activeIdx].elementType === 'section-act') {
      return blocks[activeIdx].id;
    }

    for (let i = activeIdx; i >= 0; i--) {
      if (blocks[i].elementType === 'scene-heading') {
        return blocks[i].id;
      }
    }
    return null;
  }, [blocks, activeBlockId]);

  const normalizedFilter = sceneFilter.trim().toLowerCase();
  const filteredOutline = useMemo(() => {
    if (!normalizedFilter) return outlineItems;
    return outlineItems.filter(
      (item) =>
        item.text.toLowerCase().includes(normalizedFilter) ||
        (item.synopsis && item.synopsis.toLowerCase().includes(normalizedFilter)) ||
        (item.sceneNumber && item.sceneNumber.toLowerCase().includes(normalizedFilter))
    );
  }, [outlineItems, normalizedFilter]);

  const activeElementItem = ELEMENT_SWITCHER_ITEMS.find((item) => item.type === activeElementType);

  return (
    <aside
      aria-label="Scene Navigator and Element Palette"
      className="no-print w-64 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] flex flex-col h-full select-none"
    >
      {/* Collapsible Compact 2-Column Element Palette */}
      <div className="border-b border-[var(--border-subtle)]">
        <button
          type="button"
          aria-expanded={paletteExpanded}
          onClick={() => setPaletteExpanded((prev) => !prev)}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/60"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Elements (Tab / ⌘1–8)
          </span>
          <span className="flex items-center gap-1.5">
            {!paletteExpanded && activeElementItem && (
              <span className="text-[10px] font-medium text-[var(--accent-text)] bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded px-1.5 py-0.5">
                {activeElementItem.shortLabel}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${
                paletteExpanded ? 'rotate-0' : '-rotate-90'
              }`}
              aria-hidden="true"
            />
          </span>
        </button>

        {paletteExpanded && (
          <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-1">
            {ELEMENT_SWITCHER_ITEMS.map((item) => {
              const isSelected = activeElementType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => onSelectElementType(item.type)}
                  title={`${item.label} (${item.shortcut})`}
                  aria-pressed={isSelected}
                  className={`px-2 py-1.5 rounded-md text-left text-[11px] flex items-center justify-between gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
                    isSelected
                      ? 'bg-amber-500/15 text-[var(--text-primary)] border border-amber-500/40 font-medium'
                      : 'hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={`shrink-0 ${isSelected ? 'text-amber-500' : 'text-amber-500/80'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.shortLabel}</span>
                  </span>
                  <kbd className="text-[9px] text-[var(--text-muted)] font-mono shrink-0">
                    {item.shortcut}
                  </kbd>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scene Navigator Header & Search */}
      <div className="p-3 border-b border-[var(--border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Scenes ({sceneCount})
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="xs"
              onClick={onAddIntervalMarker}
              title="Insert Interval / Act Break"
            >
              + Act
            </Button>
            <Button
              variant="amber-soft"
              size="xs"
              leftIcon={<Plus className="w-3 h-3" />}
              onClick={onAddNewScene}
              title="Add New Scene"
            >
              Scene
            </Button>
          </div>
        </div>

        <div className="relative">
          <Input
            value={sceneFilter}
            onChange={(e) => setSceneFilter(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
            placeholder="Filter scenes..."
            aria-label="Filter scenes"
            className={sceneFilter ? 'pr-7' : ''}
          />
          {sceneFilter && (
            <button
              type="button"
              onClick={() => setSceneFilter('')}
              aria-label="Clear scene filter"
              title="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scene List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredOutline.length === 0 ? (
          normalizedFilter.length > 0 ? (
            <div className="text-center py-8 px-3 space-y-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                No matching scenes
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                No scenes match &ldquo;{sceneFilter.trim()}&rdquo;.
              </p>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setSceneFilter('')}
              >
                Clear Filter
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 px-3 space-y-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                No scenes yet
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Press <span className="text-amber-500 font-medium">+ Scene</span> to start your outline.
              </p>
            </div>
          )
        ) : (
          filteredOutline.map((item) => {
            if (item.elementType === 'section-act') {
              const isActActive = activeSceneId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToBlock(item.id)}
                  className={`w-full text-left px-2.5 py-1.5 mt-2 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
                    isActActive
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-500'
                      : 'bg-amber-500/10 border-amber-500/25 text-amber-500 hover:bg-amber-500/15'
                  }`}
                >
                  <Flag className="w-3 h-3 shrink-0" />
                  <span className="truncate">{item.text || 'INTERVAL BREAK'}</span>
                </button>
              );
            }

            const isActive = activeSceneId === item.id;
            const revDot =
              REVISION_COLORS.find((r) => r.id === item.revisionColor)?.dotClass ?? 'bg-stone-400';
            const rasaMeta = item.rasa ? NAVARASA_META[item.rasa] : null;

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'location' : undefined}
                onClick={() => onJumpToBlock(item.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md border transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
                  isActive
                    ? 'bg-[var(--bg-elevated)] border-amber-500/50 text-[var(--text-primary)] shadow-xs'
                    : 'bg-transparent border-transparent hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                } ${item.omitted ? 'opacity-45 line-through' : ''}`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variant={isActive ? 'amber' : 'stone'} mono>
                      {item.sceneNumber ?? '•'}
                    </Badge>
                    <span className="text-xs font-medium truncate">
                      {item.text.trim() || 'INT. UNTITLED SCENE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.locked && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                    {item.revisionColor !== 'white' && (
                      <span className={`w-2 h-2 rounded-full ${revDot}`} />
                    )}
                  </div>
                </div>
                {(item.synopsis || rasaMeta) && (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {item.synopsis || ''}
                    </p>
                    {rasaMeta && (
                      <Badge variant="amber" className="text-[9px] py-0 shrink-0">
                        {rasaMeta.name}
                      </Badge>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
