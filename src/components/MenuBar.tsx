import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  Clapperboard,
  ClipboardPaste,
  Clock,
  Columns,
  Download,
  FileCode2,
  FilePlus,
  FileText,
  FolderOpen,
  History,
  Keyboard,
  Lock,
  Printer,
  Redo2,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Undo2,
  Unlock,
  Users,
} from 'lucide-react';
import {
  ElementType,
  RevisionColor,
  StudioTheme,
  WorkspaceView,
} from '../types/screenplay';
import { REVISION_COLORS } from './Titlebar';

export interface MenuBarProps {
  onNewScript: () => void;
  onNewWindow: () => void;
  onOpenFile: () => void;
  onSave: () => void;
  onSaveProject?: () => void;
  recentProjects?: string[];
  onOpenRecentProject?: (path: string) => void;
  onOpenShortcuts?: () => void;
  onOpenSnapshots?: () => void;
  snapshotCount?: number;
  onExportFountain: () => void;
  onExportFdx: () => void;
  onExportPdf: () => void;
  onCopyWhatsApp: () => void;
  onOpenSmartPaste: () => void;
  onOpenTitlePageModal: () => void;
  onOpenTemplates: () => void;
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  activeElementType: ElementType;
  onSelectElementType: (type: ElementType) => void;
  scenesLocked: boolean;
  onToggleSceneLocks: () => void;
  revisionColor: RevisionColor;
  onSelectRevisionColor: (color: RevisionColor) => void;
  theme: StudioTheme;
  onSelectTheme: (theme: StudioTheme) => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

type MenuId = 'file' | 'edit' | 'format' | 'production' | 'view';
type ActiveMenu = MenuId | null;

const MENU_ORDER: MenuId[] = ['file', 'edit', 'format', 'production', 'view'];

export const MenuBar: React.FC<MenuBarProps> = ({
  onNewScript,
  onNewWindow,
  onOpenFile,
  onSave,
  onSaveProject,
  recentProjects,
  onOpenRecentProject,
  onOpenShortcuts,
  onOpenSnapshots,
  snapshotCount,
  onExportFountain,
  onExportFdx,
  onExportPdf,
  onCopyWhatsApp,
  onOpenSmartPaste,
  onOpenTitlePageModal,
  onOpenTemplates,
  activeView,
  onSelectView,
  activeElementType,
  onSelectElementType,
  scenesLocked,
  onToggleSceneLocks,
  revisionColor,
  onSelectRevisionColor,
  theme,
  onSelectTheme,
  zenMode,
  onToggleZenMode,
  sidebarOpen,
  onToggleSidebar,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const [openMenu, setOpenMenu] = useState<ActiveMenu>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<MenuId, HTMLButtonElement | null>>({
    file: null,
    edit: null,
    format: null,
    production: null,
    view: null,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!openMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        const current = openMenu;
        setOpenMenu(null);
        triggerRefs.current[current]?.focus();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const idx = MENU_ORDER.indexOf(openMenu);
        const next = MENU_ORDER[(idx + 1) % MENU_ORDER.length];
        setOpenMenu(next);
        triggerRefs.current[next]?.focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = MENU_ORDER.indexOf(openMenu);
        const prev = MENU_ORDER[(idx - 1 + MENU_ORDER.length) % MENU_ORDER.length];
        setOpenMenu(prev);
        triggerRefs.current[prev]?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openMenu]);

  const handleTriggerKeyDown = (menuId: MenuId, e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const idx = MENU_ORDER.indexOf(menuId);
      const next = MENU_ORDER[(idx + 1) % MENU_ORDER.length];
      triggerRefs.current[next]?.focus();
      if (openMenu) setOpenMenu(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const idx = MENU_ORDER.indexOf(menuId);
      const prev = MENU_ORDER[(idx - 1 + MENU_ORDER.length) % MENU_ORDER.length];
      triggerRefs.current[prev]?.focus();
      if (openMenu) setOpenMenu(prev);
    } else if (e.key === 'ArrowDown' && !openMenu) {
      e.preventDefault();
      setOpenMenu(menuId);
    }
  };

  const handleAction = (callback: () => void) => {
    callback();
    setOpenMenu(null);
  };

  const triggerClass = (menuId: MenuId) =>
    `px-1.5 sm:px-2.5 py-1 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
      openMenu === menuId
        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]'
    }`;

  const panelClass =
    'absolute top-full left-0 mt-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-2xl py-1 z-50 text-xs text-[var(--text-primary)]';

  const itemClass =
    'w-full text-left px-3 py-1.5 hover:bg-amber-500/15 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:bg-amber-500/15 flex items-center justify-between transition-colors cursor-pointer';

  const disabledItemClass =
    'w-full text-left px-3 py-1.5 text-[var(--text-muted)] opacity-50 cursor-not-allowed flex items-center justify-between';

  const dividerClass = 'my-1 border-t border-[var(--border-subtle)]';

  const undoDisabled = !onUndo || canUndo === false;
  const redoDisabled = !onRedo || canRedo === false;

  return (
    <div
      ref={menuRef}
      role="menubar"
      aria-label="Application Menu"
      className="flex items-center shrink-0 text-xs relative select-none"
    >
      {/* FILE MENU */}
      <div className="relative">
        <button
          ref={(el) => {
            triggerRefs.current.file = el;
          }}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'file'}
          onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
          onMouseEnter={() => openMenu && setOpenMenu('file')}
          onKeyDown={(e) => handleTriggerKeyDown('file', e)}
          className={triggerClass('file')}
        >
          File
        </button>
        {openMenu === 'file' && (
          <div role="menu" aria-label="File menu" className={`${panelClass} w-64`}>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onNewScript)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <FilePlus className="w-3.5 h-3.5 text-[var(--text-muted)]" /> New Screenplay
              </span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⌘N</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onNewWindow)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" /> New Window
              </span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⇧⌘N</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onOpenFile)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Open Project / Script...
              </span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⌘O</kbd>
            </button>
            {recentProjects && recentProjects.length > 0 && onOpenRecentProject && (
              <>
                <div className={dividerClass} role="separator" />
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Recent Projects
                </div>
                {recentProjects.slice(0, 5).map((projPath) => {
                  const displayName = projPath.split(/[/\\]/).pop() || projPath;
                  return (
                    <button
                      key={projPath}
                      type="button"
                      role="menuitem"
                      title={projPath}
                      onClick={() => handleAction(() => onOpenRecentProject(projPath))}
                      className={itemClass}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <span className="truncate">{displayName}</span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}
            <div className={dividerClass} role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onSaveProject ?? onSave)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Save className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Save Project (.slatedraft)
              </span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⌘S</kbd>
            </button>
            {onOpenSnapshots && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleAction(onOpenSnapshots)}
                className={itemClass}
              >
                <span className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Draft Snapshots &amp; Compare...
                </span>
                {typeof snapshotCount === 'number' && snapshotCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
                    {snapshotCount}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onOpenTemplates)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Template Gallery...
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onOpenTitlePageModal)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Title Page &amp; Watermark...
              </span>
            </button>
            <div className={dividerClass} role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onExportPdf)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Print / Export PDF...
              </span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⌘P</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onExportFdx)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Export Final Draft (.fdx)
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onExportFountain)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Export Fountain (.fountain)
              </span>
            </button>
          </div>
        )}
      </div>

      {/* EDIT MENU */}
      <div className="relative">
        <button
          ref={(el) => {
            triggerRefs.current.edit = el;
          }}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'edit'}
          onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
          onMouseEnter={() => openMenu && setOpenMenu('edit')}
          onKeyDown={(e) => handleTriggerKeyDown('edit', e)}
          className={triggerClass('edit')}
        >
          Edit
        </button>
        {openMenu === 'edit' && (
          <div role="menu" aria-label="Edit menu" className={`${panelClass} w-64`}>
            <button
              type="button"
              role="menuitem"
              disabled={undoDisabled}
              aria-disabled={undoDisabled}
              onClick={() => {
                if (!undoDisabled && onUndo) handleAction(onUndo);
              }}
              className={undoDisabled ? disabledItemClass : itemClass}
            >
              <span className="flex items-center gap-2">
                <Undo2 className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Undo
              </span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⌘Z</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={redoDisabled}
              aria-disabled={redoDisabled}
              onClick={() => {
                if (!redoDisabled && onRedo) handleAction(onRedo);
              }}
              className={redoDisabled ? disabledItemClass : itemClass}
            >
              <span className="flex items-center gap-2">
                <Redo2 className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Redo
              </span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⇧⌘Z</kbd>
            </button>
            <div className={dividerClass} role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onOpenSmartPaste)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <ClipboardPaste className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Smart Script Intake...
              </span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⇧⌘V</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onCopyWhatsApp)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Copy for WhatsApp / Email
              </span>
            </button>
          </div>
        )}
      </div>

      {/* FORMAT / ELEMENT MENU */}
      <div className="relative">
        <button
          ref={(el) => {
            triggerRefs.current.format = el;
          }}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'format'}
          onClick={() => setOpenMenu(openMenu === 'format' ? null : 'format')}
          onMouseEnter={() => openMenu && setOpenMenu('format')}
          onKeyDown={(e) => handleTriggerKeyDown('format', e)}
          className={triggerClass('format')}
        >
          Format
        </button>
        {openMenu === 'format' && (
          <div role="menu" aria-label="Format menu" className={`${panelClass} w-52`}>
            {[
              { type: 'scene-heading' as ElementType, label: 'Scene Heading', key: '⌘1' },
              { type: 'action' as ElementType, label: 'Action', key: '⌘2' },
              { type: 'character' as ElementType, label: 'Character', key: '⌘3' },
              { type: 'parenthetical' as ElementType, label: 'Parenthetical', key: '⌘4' },
              { type: 'dialogue' as ElementType, label: 'Dialogue', key: '⌘5' },
              { type: 'transition' as ElementType, label: 'Transition', key: '⌘6' },
              { type: 'shot' as ElementType, label: 'Camera Shot', key: '⌘7' },
              { type: 'song-lyric' as ElementType, label: 'Song / Lyric', key: '⌘8' },
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                role="menuitem"
                onClick={() => handleAction(() => onSelectElementType(item.type))}
                className={itemClass}
              >
                <span className="flex items-center gap-2">
                  {activeElementType === item.type ? (
                    <Check className="w-3 h-3 text-amber-500" />
                  ) : (
                    <span className="w-3" />
                  )}
                  {item.label}
                </span>
                <kbd className="text-[10px] text-[var(--text-muted)] font-mono">{item.key}</kbd>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PRODUCTION MENU */}
      <div className="relative">
        <button
          ref={(el) => {
            triggerRefs.current.production = el;
          }}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'production'}
          onClick={() => setOpenMenu(openMenu === 'production' ? null : 'production')}
          onMouseEnter={() => openMenu && setOpenMenu('production')}
          onKeyDown={(e) => handleTriggerKeyDown('production', e)}
          className={triggerClass('production')}
        >
          Production
        </button>
        {openMenu === 'production' && (
          <div role="menu" aria-label="Production menu" className={`${panelClass} w-64`}>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onSelectView('production'))}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Clapperboard className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Production Breakdown &amp; Reports
              </span>
              {activeView === 'production' && <Check className="w-3 h-3 text-amber-500" />}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onToggleSceneLocks)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                {scenesLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                )}
                Lock Scene Numbers (A-Pages)
              </span>
              {scenesLocked && <Check className="w-3 h-3 text-amber-500" />}
            </button>
            <div className={dividerClass} role="separator" />
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Draft Revision Color
            </div>
            {REVISION_COLORS.map((rev) => (
              <button
                key={rev.id}
                type="button"
                role="menuitem"
                onClick={() => handleAction(() => onSelectRevisionColor(rev.id))}
                className={itemClass}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${rev.dotClass}`} />
                  {rev.label}
                </span>
                {revisionColor === rev.id && <Check className="w-3 h-3 text-amber-500" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW MENU */}
      <div className="relative">
        <button
          ref={(el) => {
            triggerRefs.current.view = el;
          }}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'view'}
          onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
          onMouseEnter={() => openMenu && setOpenMenu('view')}
          onKeyDown={(e) => handleTriggerKeyDown('view', e)}
          className={triggerClass('view')}
        >
          View
        </button>
        {openMenu === 'view' && (
          <div role="menu" aria-label="View menu" className={`${panelClass} w-64`}>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onSelectView('screenplay'))}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Screenplay Editor
              </span>
              {activeView === 'screenplay' && <Check className="w-3 h-3 text-amber-500" />}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onSelectView('beat-board'))}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Beat Board / Cards
              </span>
              {activeView === 'beat-board' && <Check className="w-3 h-3 text-amber-500" />}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onSelectView('av-split'))}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Columns className="w-3.5 h-3.5 text-[var(--text-muted)]" /> AV 2-Column Split
              </span>
              {activeView === 'av-split' && <Check className="w-3 h-3 text-amber-500" />}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onSelectView('characters'))}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Character Bible
              </span>
              {activeView === 'characters' && <Check className="w-3 h-3 text-amber-500" />}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onSelectView('production'))}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <Clapperboard className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Production Breakdown &amp; Reports
              </span>
              {activeView === 'production' && <Check className="w-3 h-3 text-amber-500" />}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onOpenTemplates)}
              className={itemClass}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Template Gallery
              </span>
              {activeView === 'templates' && <Check className="w-3 h-3 text-amber-500" />}
            </button>
            <div className={dividerClass} role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onToggleSidebar)}
              className={itemClass}
            >
              <span>{sidebarOpen ? 'Hide Scene Navigator' : 'Show Scene Navigator'}</span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⌘B</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onToggleZenMode)}
              className={itemClass}
            >
              <span>{zenMode ? 'Exit Zen Mode' : 'Enter Zen Mode'}</span>
              <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⌘\</kbd>
            </button>
            {onOpenShortcuts && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleAction(onOpenShortcuts)}
                className={itemClass}
              >
                <span className="flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Keyboard Shortcuts
                </span>
                <kbd className="text-[10px] text-[var(--text-muted)] font-mono">⌘/</kbd>
              </button>
            )}
            <div className={dividerClass} role="separator" />
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Studio Theme
            </div>
            {[
              { id: 'obsidian' as StudioTheme, label: 'Obsidian Dark' },
              { id: 'sahitya' as StudioTheme, label: 'Archival Paper' },
              { id: 'neel' as StudioTheme, label: 'Midnight Slate' },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                role="menuitem"
                onClick={() => handleAction(() => onSelectTheme(th.id))}
                className={itemClass}
              >
                <span>{th.label}</span>
                {theme === th.id && <Check className="w-3 h-3 text-amber-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
