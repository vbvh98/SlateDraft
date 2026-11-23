import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clapperboard,
  Columns,
  Download,
  FileText,
  Globe,
  LayoutGrid,
  Maximize2,
  Mic,
  Minimize2,
  Users,
} from 'lucide-react';
import {
  ElementType,
  IndicLanguage,
  RevisionColor,
  StudioTheme,
  TitlePageData,
  WorkspaceView,
} from '../types/screenplay';
import { LANGUAGE_METADATA } from '../services/transliterationEngine';
import { isTauriDesktopRuntime } from '../services/rustBridge';
import { MenuBar } from './MenuBar';
import { Button, IconButton } from './ui';

export interface TitlebarProps {
  titlePage: TitlePageData;
  onUpdateTitle: (newTitle: string) => void;
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  language: IndicLanguage;
  onSelectLanguage: (lang: IndicLanguage) => void;
  revisionColor: RevisionColor;
  onSelectRevisionColor: (color: RevisionColor) => void;
  scenesLocked: boolean;
  onToggleSceneLocks: () => void;
  theme: StudioTheme;
  onSelectTheme: (theme: StudioTheme) => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeElementType: ElementType;
  onSelectElementType: (type: ElementType) => void;
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
  onOpenTitlePageModal: () => void;
  onOpenTemplates: () => void;
  onOpenSmartPaste: () => void;
  onToggleVoiceDrawer: () => void;
  voiceDrawerOpen: boolean;
  onExportFountain: () => void;
  onExportFdx: () => void;
  onCopyWhatsApp: () => void;
  onPrintPdf: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const REVISION_COLORS: Array<{
  id: RevisionColor;
  label: string;
  dotClass: string;
}> = [
  { id: 'white', label: 'White (Original)', dotClass: 'bg-stone-200 ring-1 ring-stone-400/50' },
  { id: 'blue', label: 'Blue Revision', dotClass: 'bg-sky-400' },
  { id: 'pink', label: 'Pink Revision', dotClass: 'bg-pink-400' },
  { id: 'yellow', label: 'Yellow Revision', dotClass: 'bg-amber-300' },
  { id: 'green', label: 'Green Revision', dotClass: 'bg-emerald-400' },
  { id: 'goldenrod', label: 'Goldenrod Revision', dotClass: 'bg-orange-400' },
  { id: 'buff', label: 'Buff Revision', dotClass: 'bg-yellow-200 ring-1 ring-stone-400/40' },
  { id: 'salmon', label: 'Salmon Revision', dotClass: 'bg-rose-400' },
  { id: 'cherry', label: 'Cherry Revision', dotClass: 'bg-red-500' },
];

const WORKSPACE_TABS: Array<{
  id: WorkspaceView;
  label: string;
  title: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'screenplay',
    label: 'Screenplay',
    title: 'Screenplay Editor',
    icon: <FileText className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    id: 'beat-board',
    label: 'Cards',
    title: 'Beat Board / Scene Cards',
    icon: <LayoutGrid className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    id: 'av-split',
    label: 'AV Split',
    title: 'AV 2-Column Split',
    icon: <Columns className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    id: 'characters',
    label: 'Characters',
    title: 'Character Bible',
    icon: <Users className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    id: 'production',
    label: 'Production',
    title: 'Production Breakdown & Reports',
    icon: <Clapperboard className="w-3.5 h-3.5 shrink-0" />,
  },
];

export const Titlebar: React.FC<TitlebarProps> = ({
  titlePage,
  onUpdateTitle,
  activeView,
  onSelectView,
  language,
  onSelectLanguage,
  revisionColor,
  onSelectRevisionColor,
  scenesLocked,
  onToggleSceneLocks,
  theme,
  onSelectTheme,
  zenMode,
  onToggleZenMode,
  sidebarOpen,
  onToggleSidebar,
  activeElementType,
  onSelectElementType,
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
  onOpenTitlePageModal,
  onOpenTemplates,
  onOpenSmartPaste,
  onToggleVoiceDrawer,
  voiceDrawerOpen,
  onExportFountain,
  onExportFdx,
  onCopyWhatsApp,
  onPrintPdf,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const [revMenuOpen, setRevMenuOpen] = useState(false);
  const revPopoverRef = useRef<HTMLDivElement>(null);
  const revButtonRef = useRef<HTMLButtonElement>(null);

  const currentRev = REVISION_COLORS.find((r) => r.id === revisionColor) ?? REVISION_COLORS[0];
  const isTauriMac =
    typeof navigator !== 'undefined' &&
    isTauriDesktopRuntime() &&
    /Mac/i.test(navigator.platform || navigator.userAgent);

  useEffect(() => {
    if (!revMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (revPopoverRef.current && !revPopoverRef.current.contains(e.target as Node)) {
        setRevMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setRevMenuOpen(false);
        revButtonRef.current?.focus();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [revMenuOpen]);

  return (
    <header
      data-tauri-drag-region
      className="no-print border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] select-none z-30"
    >
      <div
        data-tauri-drag-region
        className="min-h-11 py-1.5 lg:py-0 lg:h-11 px-2.5 sm:px-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-3"
      >
        {/* Left: Application Menus + Editable Script Title */}
        <div
          data-tauri-drag-region
          className={`order-1 flex items-center gap-1.5 min-w-0 flex-1 xl:flex-none ${
            isTauriMac ? 'pl-[74px]' : ''
          }`}
        >
          <MenuBar
            onNewScript={onNewScript}
            onNewWindow={onNewWindow}
            onOpenFile={onOpenFile}
            onSave={onSave}
            onSaveProject={onSaveProject}
            recentProjects={recentProjects}
            onOpenRecentProject={onOpenRecentProject}
            onOpenShortcuts={onOpenShortcuts}
            onOpenSnapshots={onOpenSnapshots}
            snapshotCount={snapshotCount}
            onExportFountain={onExportFountain}
            onExportFdx={onExportFdx}
            onExportPdf={onPrintPdf}
            onCopyWhatsApp={onCopyWhatsApp}
            onOpenSmartPaste={onOpenSmartPaste}
            onOpenTitlePageModal={onOpenTitlePageModal}
            onOpenTemplates={onOpenTemplates}
            activeView={activeView}
            onSelectView={onSelectView}
            activeElementType={activeElementType}
            onSelectElementType={onSelectElementType}
            scenesLocked={scenesLocked}
            onToggleSceneLocks={onToggleSceneLocks}
            revisionColor={revisionColor}
            onSelectRevisionColor={onSelectRevisionColor}
            theme={theme}
            onSelectTheme={onSelectTheme}
            zenMode={zenMode}
            onToggleZenMode={onToggleZenMode}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={onToggleSidebar}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
          />

          <div
            data-tauri-drag-region
            className="hidden sm:flex items-center gap-1.5 min-w-0 flex-1"
          >
            <span
              className="h-3.5 w-px bg-[var(--border-strong)]/70 shrink-0 select-none"
              aria-hidden="true"
            />

            <input
              type="text"
              value={titlePage.title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              aria-label="Screenplay Title"
              className="select-text h-7 bg-transparent hover:bg-[var(--bg-surface-2)] focus:bg-[var(--bg-elevated)] px-2 rounded-md text-xs font-semibold tracking-wide text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 min-w-[68px] w-full max-w-[180px] truncate transition-colors"
              placeholder="UNTITLED SCREENPLAY"
            />
          </div>
        </div>

        {/* Center: Segmented Workspace View Switcher (wraps cleanly to sub-row below 1024px) */}
        <div className="order-3 basis-full pt-1 border-t border-[var(--border-subtle)]/70 flex justify-center lg:order-2 lg:basis-auto lg:pt-0 lg:border-t-0 shrink-0">
          <div
            role="tablist"
            aria-label="Workspace Views"
            className="inline-flex items-center h-8 bg-[var(--bg-surface-2)] p-0.5 rounded-lg border border-[var(--border-subtle)] max-w-full overflow-x-auto"
          >
            {WORKSPACE_TABS.map((tab) => {
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectView(tab.id)}
                  title={tab.title}
                  className={`h-[26px] px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/70'
                  }`}
                >
                  {tab.icon}
                  <span
                    className={
                      isActive ? 'inline' : 'hidden sm:inline lg:hidden min-[1400px]:inline'
                    }
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Language, Interactive Draft Color, Voice, Export, Zen (always visible) */}
        <div
          data-tauri-drag-region
          className="order-2 lg:order-3 flex items-center justify-end gap-1.5 shrink-0"
        >
          {/* Input Language Selector */}
          <div className="relative h-7 inline-flex items-center bg-[var(--bg-surface-2)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md pl-2 pr-5 text-xs transition-colors focus-within:ring-2 focus-within:ring-amber-500/60">
            <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0 mr-1.5" aria-hidden="true" />
            <select
              aria-label="Input Language"
              value={language}
              onChange={(e) => onSelectLanguage(e.target.value as IndicLanguage)}
              className="appearance-none bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer max-w-[76px] xl:max-w-[118px] min-[1400px]:max-w-[144px] text-xs truncate pr-1"
            >
              {(Object.keys(LANGUAGE_METADATA) as IndicLanguage[]).map((langKey) => (
                <option
                  key={langKey}
                  value={langKey}
                  className="bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                >
                  {LANGUAGE_METADATA[langKey].label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3 h-3 text-[var(--text-muted)] pointer-events-none absolute right-1.5"
              aria-hidden="true"
            />
          </div>

          {/* Interactive Draft Revision Color Pill & Popover */}
          <div ref={revPopoverRef} className="relative">
            <button
              ref={revButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={revMenuOpen}
              aria-label={`Draft Revision Color: ${currentRev.label}`}
              onClick={() => setRevMenuOpen((prev) => !prev)}
              title={`Active Draft: ${currentRev.label} — Click to switch`}
              className={`h-7 inline-flex items-center gap-1.5 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-elevated)] border rounded-md px-2 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
                revMenuOpen ? 'border-amber-500/60' : 'border-[var(--border-subtle)]'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentRev.dotClass}`} />
              <span className="text-[var(--text-secondary)] text-[11px] hidden min-[1400px]:inline">
                {currentRev.label.split(' ')[0]}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${
                  revMenuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {revMenuOpen && (
              <div
                role="menu"
                aria-label="Draft Revision Color"
                className="absolute right-0 top-full mt-1.5 w-52 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-2xl py-1 z-50 text-xs"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)] mb-1">
                  Draft Revision Color
                </div>
                {REVISION_COLORS.map((rev) => {
                  const isSelected = revisionColor === rev.id;
                  return (
                    <button
                      key={rev.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onSelectRevisionColor(rev.id);
                        setRevMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-amber-500/15 ${
                        isSelected
                          ? 'bg-amber-500/15 text-[var(--text-primary)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${rev.dotClass}`} />
                        <span>{rev.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            variant={voiceDrawerOpen ? 'primary' : 'outline'}
            size="sm"
            className="h-7 px-2 xl:px-2.5"
            leftIcon={<Mic className="w-3.5 h-3.5 shrink-0" />}
            onClick={onToggleVoiceDrawer}
            title="Table Read Narration & Voice Tools"
            aria-label="Voice Tools"
          >
            <span className="hidden xl:inline">Voice</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="h-7 px-2.5"
            leftIcon={<Download className="w-3.5 h-3.5 shrink-0" />}
            onClick={onPrintPdf}
            title="Export Screenplay as Industry PDF"
          >
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>

          <IconButton
            active={zenMode}
            variant="secondary"
            className="h-7 w-7 p-0"
            icon={
              zenMode ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )
            }
            onClick={onToggleZenMode}
            title="Toggle Distraction-Free Zen Mode (⌘\)"
            aria-label={zenMode ? 'Exit Zen Mode' : 'Enter Zen Mode'}
          />
        </div>
      </div>
    </header>
  );
};
