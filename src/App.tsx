import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, Clock, FileText, Globe, Lock } from 'lucide-react';
import {
  AVRow,
  CharacterProfile,
  ElementType,
  IndicLanguage,
  NavarasaTag,
  ProductionState,
  ProductionTags,
  RevisionColor,
  ScriptAnalyticsReport,
  ScriptBlock,
  ScriptTemplate,
  StudioTheme,
  TitlePageData,
  WorkspaceView,
} from './types/screenplay';
import {
  DEFAULT_TITLE_PAGE,
  INITIAL_BLANK_AV_ROWS,
  INITIAL_BLANK_BLOCKS,
  INITIAL_BLANK_CHARACTERS,
} from './data/templates';
import {
  extractFdxTitlePage,
  formatWhatsAppReadableText,
  moveSceneChunk,
  parseFdxXml,
} from './services/formatInterchange';
import {
  invokeRustAnalytics,
  invokeRustExportFdx,
  invokeRustExportFountain,
  invokeRustParseScript,
  invokeRustSceneLocks,
} from './services/rustBridge';
import {
  buildProjectSlug,
  getRecentProjects,
  invokeNativeNewWindow,
  loadProjectFile,
  parseProjectFile,
  recordRecentProject,
  saveProjectFile,
  serializeProjectFile,
  SlateDraftProjectFile,
  writeBackupSnapshot,
} from './services/projectStorage';
import {
  cloneScriptBlocks,
  createDraftSnapshot,
  DraftSnapshot,
} from './services/snapshotEngine';
import { LANGUAGE_METADATA } from './services/transliterationEngine';
import { AVSplitWorkspace } from './components/AVSplitWorkspace';
import { BeatBoard } from './components/BeatBoard';
import { CharacterHub } from './components/CharacterHub';
import { ConfirmModal } from './components/ConfirmModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProductionReports } from './components/ProductionReports';
import { QuickstartBanner } from './components/QuickstartBanner';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SidebarLeft } from './components/SidebarLeft';
import { SnapshotsModal } from './components/SnapshotsModal';
import { TemplateGallery } from './components/TemplateGallery';
import { Titlebar } from './components/Titlebar';
import { TitlePageModal } from './components/TitlePageModal';
import { VoiceTranslationDrawer } from './components/VoiceTranslationDrawer';
import { Badge } from './components/ui';

const WORKSPACE_STORAGE_KEY = 'slatedraft-workspace-v1';
const MAX_HISTORY_ENTRIES = 100;
const TEXT_HISTORY_DEBOUNCE_MS = 400;
const AUTOSAVE_DEBOUNCE_MS = 600;

const ELEMENT_SHORTCUTS: Record<string, ElementType> = {
  '1': 'scene-heading',
  '2': 'action',
  '3': 'character',
  '4': 'parenthetical',
  '5': 'dialogue',
  '6': 'transition',
  '7': 'shot',
  '8': 'song-lyric',
};

const VALID_THEMES = new Set<StudioTheme>(['obsidian', 'sahitya', 'neel']);

const INITIAL_PRODUCTION_STATE: ProductionState = {
  shootDays: [],
  shots: [],
  castCalls: {},
};

interface PersistedWorkspace {
  titlePage: TitlePageData;
  blocks: ScriptBlock[];
  avRows: AVRow[];
  characters: CharacterProfile[];
  productionState?: ProductionState;
  language: IndicLanguage;
  revisionColor: RevisionColor;
  scenesLocked: boolean;
  theme: StudioTheme;
  activeTemplateId: string;
  snapshots?: DraftSnapshot[];
}

function loadPersistedWorkspace(): Partial<PersistedWorkspace> | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>;
    if (!parsed || typeof parsed !== 'object') return null;

    const validBlocks =
      Array.isArray(parsed.blocks) &&
      parsed.blocks.length > 0 &&
      parsed.blocks.every(
        (b) => b && typeof b === 'object' && typeof b.id === 'string' && typeof b.elementType === 'string'
      )
        ? parsed.blocks
        : undefined;

    const validAvRows =
      Array.isArray(parsed.avRows) && parsed.avRows.length > 0 ? parsed.avRows : undefined;

    const validCharacters = Array.isArray(parsed.characters) ? parsed.characters : undefined;

    const validProductionState: ProductionState | undefined =
      parsed.productionState &&
      typeof parsed.productionState === 'object' &&
      Array.isArray(parsed.productionState.shootDays) &&
      Array.isArray(parsed.productionState.shots)
        ? {
            shootDays: parsed.productionState.shootDays,
            shots: parsed.productionState.shots,
            castCalls:
              parsed.productionState.castCalls &&
              typeof parsed.productionState.castCalls === 'object'
                ? parsed.productionState.castCalls
                : {},
            ...(Array.isArray(parsed.productionState.crewContacts)
              ? { crewContacts: parsed.productionState.crewContacts }
              : {}),
          }
        : undefined;

    const validSnapshots: DraftSnapshot[] | undefined = Array.isArray(parsed.snapshots)
      ? parsed.snapshots.filter(
          (s): s is DraftSnapshot =>
            Boolean(s) &&
            typeof s === 'object' &&
            typeof s.id === 'string' &&
            typeof s.name === 'string' &&
            typeof s.createdAt === 'string' &&
            Array.isArray(s.blocks)
        )
      : undefined;

    const validTheme =
      parsed.theme && VALID_THEMES.has(parsed.theme) ? parsed.theme : undefined;

    const validLanguage =
      parsed.language && parsed.language in LANGUAGE_METADATA ? parsed.language : undefined;

    return {
      titlePage: parsed.titlePage
        ? { ...DEFAULT_TITLE_PAGE, ...parsed.titlePage }
        : undefined,
      blocks: validBlocks,
      avRows: validAvRows,
      characters: validCharacters,
      productionState: validProductionState,
      language: validLanguage,
      revisionColor: parsed.revisionColor,
      scenesLocked:
        typeof parsed.scenesLocked === 'boolean' ? parsed.scenesLocked : undefined,
      theme: validTheme,
      activeTemplateId:
        typeof parsed.activeTemplateId === 'string' ? parsed.activeTemplateId : undefined,
      snapshots: validSnapshots,
    };
  } catch {
    return null;
  }
}

export const App: React.FC = () => {
  const hydratedRef = useRef<Partial<PersistedWorkspace> | null | undefined>(undefined);
  if (hydratedRef.current === undefined) {
    hydratedRef.current = loadPersistedWorkspace();
  }
  const initial = hydratedRef.current;

  const initialBlocks = initial?.blocks ?? INITIAL_BLANK_BLOCKS;

  const [titlePage, setTitlePage] = useState<TitlePageData>(
    () => initial?.titlePage ?? DEFAULT_TITLE_PAGE
  );
  const [blocks, setBlocks] = useState<ScriptBlock[]>(() => initialBlocks);
  const [avRows, setAvRows] = useState<AVRow[]>(
    () => initial?.avRows ?? INITIAL_BLANK_AV_ROWS
  );
  const [characters, setCharacters] = useState<CharacterProfile[]>(
    () => initial?.characters ?? INITIAL_BLANK_CHARACTERS
  );
  const [productionState, setProductionState] = useState<ProductionState>(
    () => initial?.productionState ?? INITIAL_PRODUCTION_STATE
  );
  const [snapshots, setSnapshots] = useState<DraftSnapshot[]>(
    () => initial?.snapshots ?? []
  );

  const [activeBlockId, setActiveBlockId] = useState<string | null>(
    () => initialBlocks[0]?.id ?? null
  );
  const [activeView, setActiveView] = useState<WorkspaceView>('screenplay');
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    () => initial?.activeTemplateId ?? 'tpl-blank-feature'
  );

  const [language, setLanguage] = useState<IndicLanguage>(
    () => initial?.language ?? 'english'
  );
  const [revisionColor, setRevisionColor] = useState<RevisionColor>(
    () => initial?.revisionColor ?? 'white'
  );
  const [scenesLocked, setScenesLocked] = useState<boolean>(
    () => initial?.scenesLocked ?? false
  );
  const [theme, setTheme] = useState<StudioTheme>(() => initial?.theme ?? 'obsidian');
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const [titlePageModalOpen, setTitlePageModalOpen] = useState<boolean>(false);
  const [smartPasteOpen, setSmartPasteOpen] = useState<boolean>(false);
  const [voiceDrawerOpen, setVoiceDrawerOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [snapshotsModalOpen, setSnapshotsModalOpen] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMountedRef = useRef<boolean>(false);
  const suppressDirtyRef = useRef<boolean>(false);

  // Ref-backed Undo/Redo History Stack (max 100 entries, debounced text + immediate structural)
  const blocksRef = useRef<ScriptBlock[]>(initialBlocks);
  const revisionColorRef = useRef<RevisionColor>(revisionColor);
  revisionColorRef.current = revisionColor;
  const scenesLockedRef = useRef<boolean>(scenesLocked);
  scenesLockedRef.current = scenesLocked;
  const historyRef = useRef<ScriptBlock[][]>([initialBlocks]);
  const historyIndexRef = useRef<number>(0);
  const pendingTextCommitRef = useRef<boolean>(false);
  const textDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [historyMeta, setHistoryMeta] = useState<{
    index: number;
    length: number;
    pending: boolean;
  }>({
    index: 0,
    length: 1,
    pending: false,
  });

  const canUndo = historyMeta.index > 0 || historyMeta.pending;
  const canRedo = historyMeta.index < historyMeta.length - 1;

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const pushHistorySnapshot = (snapshot: ScriptBlock[]) => {
    const truncated = historyRef.current.slice(0, historyIndexRef.current + 1);
    truncated.push(snapshot);
    const bounded =
      truncated.length > MAX_HISTORY_ENTRIES
        ? truncated.slice(truncated.length - MAX_HISTORY_ENTRIES)
        : truncated;
    historyRef.current = bounded;
    historyIndexRef.current = bounded.length - 1;
    pendingTextCommitRef.current = false;
    setHistoryMeta({
      index: historyIndexRef.current,
      length: bounded.length,
      pending: false,
    });
  };

  const flushPendingTextHistory = () => {
    if (textDebounceTimerRef.current) {
      clearTimeout(textDebounceTimerRef.current);
      textDebounceTimerRef.current = null;
    }
    if (pendingTextCommitRef.current) {
      pushHistorySnapshot(blocksRef.current);
    }
  };

  const commitBlocks = useCallback((next: ScriptBlock[], mode: 'immediate' | 'debounced') => {
    if (mode === 'immediate') {
      flushPendingTextHistory();
      blocksRef.current = next;
      setBlocks(next);
      pushHistorySnapshot(next);
    } else {
      blocksRef.current = next;
      setBlocks(next);
      pendingTextCommitRef.current = true;
      setHistoryMeta((prev) => (prev.pending ? prev : { ...prev, pending: true }));
      if (textDebounceTimerRef.current) {
        clearTimeout(textDebounceTimerRef.current);
      }
      textDebounceTimerRef.current = setTimeout(() => {
        textDebounceTimerRef.current = null;
        if (pendingTextCommitRef.current) {
          pushHistorySnapshot(blocksRef.current);
        }
      }, TEXT_HISTORY_DEBOUNCE_MS);
    }
  }, []);

  const resetHistory = (freshBlocks: ScriptBlock[]) => {
    if (textDebounceTimerRef.current) {
      clearTimeout(textDebounceTimerRef.current);
      textDebounceTimerRef.current = null;
    }
    pendingTextCommitRef.current = false;
    historyRef.current = [freshBlocks];
    historyIndexRef.current = 0;
    blocksRef.current = freshBlocks;
    setBlocks(freshBlocks);
    setHistoryMeta({ index: 0, length: 1, pending: false });
  };

  const handleUndo = useCallback(() => {
    if (textDebounceTimerRef.current) {
      clearTimeout(textDebounceTimerRef.current);
      textDebounceTimerRef.current = null;
    }
    if (pendingTextCommitRef.current) {
      const prevIdx = historyIndexRef.current;
      const truncated = historyRef.current.slice(0, prevIdx + 1);
      truncated.push(blocksRef.current);
      const bounded =
        truncated.length > MAX_HISTORY_ENTRIES
          ? truncated.slice(truncated.length - MAX_HISTORY_ENTRIES)
          : truncated;
      const targetIdx = Math.max(0, bounded.length - 2);
      historyRef.current = bounded;
      historyIndexRef.current = targetIdx;
      pendingTextCommitRef.current = false;
      const target = bounded[targetIdx];
      blocksRef.current = target;
      setBlocks(target);
      setHistoryMeta({ index: targetIdx, length: bounded.length, pending: false });
      showToast('Undo');
      return;
    }
    if (historyIndexRef.current > 0) {
      const targetIdx = historyIndexRef.current - 1;
      historyIndexRef.current = targetIdx;
      const target = historyRef.current[targetIdx];
      blocksRef.current = target;
      setBlocks(target);
      setHistoryMeta({
        index: targetIdx,
        length: historyRef.current.length,
        pending: false,
      });
      showToast('Undo');
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (textDebounceTimerRef.current) {
      clearTimeout(textDebounceTimerRef.current);
      textDebounceTimerRef.current = null;
    }
    pendingTextCommitRef.current = false;
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const targetIdx = historyIndexRef.current + 1;
      historyIndexRef.current = targetIdx;
      const target = historyRef.current[targetIdx];
      blocksRef.current = target;
      setBlocks(target);
      setHistoryMeta({
        index: targetIdx,
        length: historyRef.current.length,
        pending: false,
      });
      showToast('Redo');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (textDebounceTimerRef.current) {
        clearTimeout(textDebounceTimerRef.current);
      }
    };
  }, []);

  // Sync theme attribute on <html>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  // Load recent projects list on mount
  useEffect(() => {
    let active = true;
    getRecentProjects()
      .then((list) => {
        if (active) setRecentProjects(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Warn before closing/reloading when there are unsaved project changes
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Debounced localStorage autosave
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (suppressDirtyRef.current) {
      suppressDirtyRef.current = false;
    } else {
      setIsDirty(true);
    }
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const payload: PersistedWorkspace = {
            titlePage,
            blocks,
            avRows,
            characters,
            productionState,
            language,
            revisionColor,
            scenesLocked,
            theme,
            activeTemplateId,
            snapshots,
          };
          window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
        }
      } catch {
        // Ignore quota / private-browsing storage errors
      } finally {
        setSaveStatus('saved');
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    titlePage,
    blocks,
    avRows,
    characters,
    productionState,
    language,
    revisionColor,
    scenesLocked,
    theme,
    activeTemplateId,
    snapshots,
  ]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const [analytics, setAnalytics] = useState<ScriptAnalyticsReport>({
    totalBlocks: blocks.length,
    totalScenes: 0,
    totalWords: 0,
    totalPages: 0,
    totalEighths: 0,
    formattedEighths: '0/8 pgs',
    estimatedRuntimeMinutes: 0,
    latinStandardMinutes: 0,
    indicCalibrationFactor: 1,
    dialoguePercentage: 0,
    actionPercentage: 0,
    songCount: 0,
    characters: [],
    locations: [],
  });

  const analyticsMountedRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const runAnalytics = () => {
      invokeRustAnalytics(blocks, language)
        .then((report) => {
          if (!cancelled) setAnalytics(report);
        })
        .catch((err) => {
          console.error('Rust analytics error:', err);
        });
    };

    if (!analyticsMountedRef.current) {
      analyticsMountedRef.current = true;
      runAnalytics();
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(runAnalytics, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [blocks, language]);

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) ?? blocks[0] ?? null,
    [blocks, activeBlockId]
  );

  const knownCharacterNames = useMemo(() => {
    const names = new Set<string>();
    characters.forEach((c) => names.add(c.name.toUpperCase()));
    analytics.characters.forEach((c) => names.add(c.name.toUpperCase()));
    return Array.from(names);
  }, [characters, analytics.characters]);

  // File Menu Operations
  const applyProjectFile = (project: SlateDraftProjectFile, sourceLabel: string) => {
    suppressDirtyRef.current = true;
    setTitlePage(project.titlePage);
    resetHistory(project.blocks);
    setAvRows(project.avRows);
    setCharacters(project.characters);
    setProductionState(project.productionState);
    setLanguage(project.language);
    setRevisionColor(project.revisionColor);
    setScenesLocked(project.scenesLocked);
    setTheme(project.theme);
    setActiveTemplateId(project.activeTemplateId);
    setSnapshots(project.snapshots ?? []);
    setActiveBlockId(project.blocks[0]?.id ?? null);
    setActiveView('screenplay');
    setIsDirty(false);
    showToast(`Opened project ${sourceLabel} (${project.blocks.length} blocks)`);
  };

  const executeNewScript = () => {
    suppressDirtyRef.current = true;
    setTitlePage(DEFAULT_TITLE_PAGE);
    resetHistory(INITIAL_BLANK_BLOCKS);
    setAvRows(INITIAL_BLANK_AV_ROWS);
    setCharacters(INITIAL_BLANK_CHARACTERS);
    setProductionState(INITIAL_PRODUCTION_STATE);
    setScenesLocked(false);
    setRevisionColor('white');
    setActiveTemplateId('tpl-blank-feature');
    setSnapshots([]);
    setActiveBlockId(INITIAL_BLANK_BLOCKS[0].id);
    setActiveView('screenplay');
    setIsDirty(false);
    showToast('Created new blank screenplay');
  };

  const handleNewScript = () => {
    if (blocksRef.current.length > 1 || blocksRef.current[0]?.text !== 'INT. ') {
      setConfirmDialog({
        title: 'Create New Blank Screenplay?',
        message:
          'Any unsaved changes in the current draft, characters, AV rows, and production boards will be cleared.',
        confirmLabel: 'Create New',
        danger: true,
        onConfirm: () => {
          setConfirmDialog(null);
          executeNewScript();
        },
      });
      return;
    }
    executeNewScript();
  };

  const handleNewWindow = async () => {
    const openedNative = await invokeNativeNewWindow();
    if (!openedNative) {
      window.open(window.location.href, '_blank', 'width=1400,height=900');
    }
  };

  const handleOpenFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.slatedraft') || content.trimStart().startsWith('{')) {
        const project = parseProjectFile(content);
        if (project) {
          applyProjectFile(project, file.name);
          void recordRecentProject(file.name).then(setRecentProjects);
          return;
        }
        if (lowerName.endsWith('.slatedraft')) {
          showToast(`Invalid or unsupported .slatedraft project file: ${file.name}`);
          return;
        }
      }

      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const isFdx = lowerName.endsWith('.fdx') || content.includes('<FinalDraft');

      const parsed = isFdx
        ? await parseFdxXml(content, revisionColor)
        : await invokeRustParseScript(content);

      if (parsed.length > 0) {
        const fdxTitleMeta = isFdx ? await extractFdxTitlePage(content) : {};
        setTitlePage((prev) => ({
          ...prev,
          title: (fdxTitleMeta.title || fileName).toUpperCase(),
          writtenBy: fdxTitleMeta.writtenBy ?? prev.writtenBy,
        }));
        const nextBlocks = await invokeRustSceneLocks(parsed, scenesLocked);
        commitBlocks(nextBlocks, 'immediate');
        setActiveBlockId(nextBlocks[0].id);
        setActiveView('screenplay');
        showToast(`Opened ${file.name} (${nextBlocks.length} blocks)`);
      } else {
        showToast(`Could not parse blocks from ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    const slug = buildProjectSlug(titlePage.title);
    const serialized = serializeProjectFile({
      titlePage,
      blocks: blocksRef.current,
      avRows,
      characters,
      productionState,
      language,
      revisionColor,
      scenesLocked,
      theme,
      activeTemplateId,
      snapshots,
    });

    const result = await saveProjectFile(`${slug}.slatedraft`, serialized);
    void writeBackupSnapshot(slug, serialized);
    const updatedRecent = await recordRecentProject(result.savedPath);
    setRecentProjects(updatedRecent);
    setIsDirty(false);
    showToast(`Saved project to ${result.savedPath.split(/[/\\]/).pop() || `${slug}.slatedraft`}`);
  };

  const handleOpenRecentProject = async (path: string) => {
    const raw = await loadProjectFile(path);
    if (raw) {
      const parsed = parseProjectFile(raw);
      if (parsed) {
        applyProjectFile(parsed, path.split(/[/\\]/).pop() || path);
        const updatedRecent = await recordRecentProject(path);
        setRecentProjects(updatedRecent);
        return;
      }
      showToast(`Could not parse project file: ${path}`);
      return;
    }
    showToast('Choose the .slatedraft file from disk to reopen it.');
    handleOpenFile();
  };

  // Screenplay block operations (stabilized with useCallback for memoized ScriptBlockRow)
  const handleUpdateBlockText = useCallback(
    (id: string, text: string) => {
      const rev = revisionColorRef.current;
      const next = blocksRef.current.map((b) =>
        b.id === id ? { ...b, text, revisionColor: rev } : b
      );
      commitBlocks(next, 'debounced');
    },
    [commitBlocks]
  );

  const handleChangeBlockElement = useCallback(
    async (id: string, elementType: ElementType) => {
      const rev = revisionColorRef.current;
      const updated = blocksRef.current.map((b) =>
        b.id === id
          ? {
              ...b,
              elementType,
              revisionColor: rev,
              sceneNumber: elementType === 'scene-heading' ? b.sceneNumber ?? '1' : undefined,
            }
          : b
      );
      commitBlocks(await invokeRustSceneLocks(updated, scenesLockedRef.current), 'immediate');
    },
    [commitBlocks]
  );

  const handleInsertBlockAfter = useCallback(
    (afterId: string, elementType: ElementType): string => {
      const newId = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newBlock: ScriptBlock = {
        id: newId,
        elementType,
        text: elementType === 'scene-heading' ? 'INT. ' : '',
        locked: false,
        omitted: false,
        revisionColor: revisionColorRef.current,
        isDualDialogue: false,
      };

      const prev = blocksRef.current;
      const idx = prev.findIndex((b) => b.id === afterId);
      const next = [...prev];
      if (idx === -1) {
        next.push(newBlock);
      } else {
        next.splice(idx + 1, 0, newBlock);
      }
      commitBlocks(next, 'immediate');

      if (elementType === 'scene-heading' || scenesLockedRef.current) {
        void invokeRustSceneLocks(next, scenesLockedRef.current).then((locked) => {
          blocksRef.current = locked;
          historyRef.current[historyIndexRef.current] = locked;
          setBlocks(locked);
        });
      }

      setActiveBlockId(newId);
      return newId;
    },
    [commitBlocks]
  );

  const handleDeleteBlock = useCallback(
    async (id: string) => {
      const prev = blocksRef.current;
      if (prev.length <= 1) return;
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const next = prev.filter((b) => b.id !== id);
      const focusIdx = Math.max(0, idx - 1);
      setActiveBlockId(next[focusIdx]?.id ?? null);
      commitBlocks(await invokeRustSceneLocks(next, scenesLockedRef.current), 'immediate');
    },
    [commitBlocks]
  );

  const handleToggleDualDialogue = useCallback(
    (id: string) => {
      const next = blocksRef.current.map((b) =>
        b.id === id ? { ...b, isDualDialogue: !b.isDualDialogue } : b
      );
      commitBlocks(next, 'immediate');
    },
    [commitBlocks]
  );

  const handleToggleOmitBlock = useCallback(
    async (id: string) => {
      const next = blocksRef.current.map((b) =>
        b.id === id ? { ...b, omitted: !b.omitted } : b
      );
      commitBlocks(await invokeRustSceneLocks(next, scenesLockedRef.current), 'immediate');
    },
    [commitBlocks]
  );

  const handleToggleSceneLocks = async () => {
    const nextLockState = !scenesLocked;
    setScenesLocked(nextLockState);
    const updated = await invokeRustSceneLocks(blocksRef.current, nextLockState);
    commitBlocks(updated, 'immediate');
    showToast(
      nextLockState
        ? 'Scene numbers locked (A-pages enabled)'
        : 'Scene numbers unlocked'
    );
  };

  const handleReplaceAllBlocks = useCallback(
    (next: ScriptBlock[]) => commitBlocks(next, 'immediate'),
    [commitBlocks]
  );

  const handleOpenSmartPaste = useCallback(() => setSmartPasteOpen(true), []);
  const handleCloseSmartPaste = useCallback(() => setSmartPasteOpen(false), []);

  const handleSmartPasteText = useCallback(
    async (rawText: string) => {
      const parsed = await invokeRustParseScript(rawText);
      if (parsed.length === 0) return;
      const next = await invokeRustSceneLocks(
        [...blocksRef.current, ...parsed],
        scenesLockedRef.current
      );
      commitBlocks(next, 'immediate');
      setActiveBlockId(parsed[0].id);
      showToast(`Imported ${parsed.length} structured blocks`);
    },
    [commitBlocks]
  );

  const handleAddNewScene = () => {
    const lastId = blocksRef.current[blocksRef.current.length - 1]?.id ?? '';
    const newId = handleInsertBlockAfter(lastId, 'scene-heading');
    setActiveView('screenplay');
    setActiveBlockId(newId);
  };

  const handleAddIntervalMarker = () => {
    const newId = `blk-act-${Date.now()}`;
    const actBlock: ScriptBlock = {
      id: newId,
      elementType: 'section-act',
      text: 'INTERVAL BLOCK',
      locked: false,
      omitted: false,
      revisionColor,
      isDualDialogue: false,
      actMarker: 'INTERVAL',
    };
    commitBlocks([...blocksRef.current, actBlock], 'immediate');
    setActiveBlockId(newId);
    showToast('Inserted Interval Break');
  };

  // Beat Board operations
  const handleUpdateSceneSynopsis = (sceneId: string, synopsis: string) => {
    const next = blocksRef.current.map((b) =>
      b.id === sceneId ? { ...b, synopsis } : b
    );
    commitBlocks(next, 'debounced');
  };

  const handleUpdateSceneRasa = (sceneId: string, rasa: NavarasaTag | undefined) => {
    const next = blocksRef.current.map((b) => (b.id === sceneId ? { ...b, rasa } : b));
    commitBlocks(next, 'immediate');
  };

  const handleMoveScene = async (sceneId: string, direction: 'up' | 'down') => {
    const prev = blocksRef.current;
    const reordered = await moveSceneChunk(prev, sceneId, direction, scenesLocked);
    if (reordered === prev) return;
    commitBlocks(reordered, 'immediate');
  };

  // Production Breakdown Tags
  const handleUpdateSceneTags = (sceneId: string, productionTags: ProductionTags) => {
    const next = blocksRef.current.map((b) =>
      b.id === sceneId ? { ...b, productionTags } : b
    );
    commitBlocks(next, 'immediate');
  };

  // AV 2-Column operations
  const handleUpdateAvRow = (id: string, patch: Partial<AVRow>) => {
    setAvRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleAddAvRowAfter = (afterId?: string) => {
    const newRow: AVRow = {
      id: `av-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      cueNumber: String(avRows.length + 1),
      durationSeconds: 5,
      shotType: 'MID',
      visualText: '',
      audioSpeaker: '',
      audioType: 'VO',
      audioText: '',
    };
    setAvRows((prev) => {
      if (!afterId) return [...prev, newRow];
      const idx = prev.findIndex((r) => r.id === afterId);
      if (idx === -1) return [...prev, newRow];
      const copy = [...prev];
      copy.splice(idx + 1, 0, newRow);
      return copy;
    });
  };

  const handleDeleteAvRow = (id: string) => {
    setAvRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  // Character Hub operations
  const handleAddCharacter = (profile: CharacterProfile) => {
    setCharacters((prev) => [...prev, profile]);
  };

  const handleUpdateCharacter = (id: string, patch: Partial<CharacterProfile>) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  // Template application
  const executeApplyTemplate = (template: ScriptTemplate) => {
    const clonedBlocks = template.blocks.map((b, idx) => ({
      ...b,
      id: `tpl-blk-${Date.now()}-${idx}`,
    }));
    commitBlocks(clonedBlocks, 'immediate');
    setActiveBlockId(clonedBlocks[0]?.id ?? null);
    if (template.avRows) {
      setAvRows(
        template.avRows.map((r, idx) => ({
          ...r,
          id: `tpl-av-${Date.now()}-${idx}`,
        }))
      );
    }
    setCharacters(template.characters ?? []);
    setProductionState(INITIAL_PRODUCTION_STATE);
    setTitlePage((prev) => ({
      ...prev,
      ...template.titlePage,
    }));
    setLanguage(template.defaultLanguage);
    setActiveTemplateId(template.id);
    setSnapshots([]);
    setActiveView(template.targetWorkspace);
    showToast(`Loaded template: ${template.name}`);
  };

  const handleApplyTemplate = (template: ScriptTemplate) => {
    const cur = blocksRef.current;
    const hasUserContent =
      cur.length > 1 ||
      (cur[0]?.text.trim() !== '' && cur[0]?.text.trim() !== 'INT.');
    if (hasUserContent) {
      setConfirmDialog({
        title: `Load Template "${template.name}"?`,
        message:
          'This will replace your current draft structure, characters, and production schedules.',
        confirmLabel: 'Load Template',
        danger: true,
        onConfirm: () => {
          setConfirmDialog(null);
          executeApplyTemplate(template);
        },
      });
      return;
    }
    executeApplyTemplate(template);
  };

  // Draft Snapshot operations
  const handleSaveSnapshot = (name: string) => {
    const snap = createDraftSnapshot(name, revisionColor, blocksRef.current);
    setSnapshots((prev) => [snap, ...prev]);
    showToast(`Saved draft snapshot "${snap.name}"`);
  };

  const handleRestoreSnapshot = (snapshot: DraftSnapshot) => {
    const restored = cloneScriptBlocks(snapshot.blocks);
    commitBlocks(restored, 'immediate');
    setActiveBlockId(restored[0]?.id ?? null);
    setSnapshotsModalOpen(false);
    showToast(`Restored draft snapshot "${snapshot.name}"`);
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    showToast('Deleted draft snapshot');
  };

  // Export & Share handlers
  const handleExportFountain = async () => {
    const content = await invokeRustExportFountain(titlePage, blocksRef.current);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titlePage.title.toLowerCase().replace(/\s+/g, '-') || 'screenplay'}.fountain`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Fountain file');
  };

  const handleExportFdx = async () => {
    const content = await invokeRustExportFdx(titlePage, blocksRef.current);
    const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titlePage.title.toLowerCase().replace(/\s+/g, '-') || 'screenplay'}.fdx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Final Draft (.fdx) file');
  };

  const handleCopyWhatsApp = async () => {
    const plain = await formatWhatsAppReadableText(blocksRef.current);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(plain);
      }
      showToast('Copied script formatted for WhatsApp/Email');
    } catch {
      showToast('Script text prepared on clipboard');
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Global Keyboard Shortcuts (⌘Z, ⇧⌘Z, ⌘1–⌘8, ⇧⌘V, ⌘N, ⌘O, ⌘S, ⌘P, ⌘B, ⌘\, Esc)
  const shortcutHandlersRef = useRef({
    handleUndo,
    handleRedo,
    handleNewScript,
    handleNewWindow,
    handleOpenFile,
    handleSave,
    handlePrintPdf,
    handleChangeBlockElement,
  });
  shortcutHandlersRef.current = {
    handleUndo,
    handleRedo,
    handleNewScript,
    handleNewWindow,
    handleOpenFile,
    handleSave,
    handlePrintPdf,
    handleChangeBlockElement,
  };

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      const target = e.target as HTMLElement | null;
      const isScriptBlock = target?.hasAttribute('data-script-block') ?? false;
      const isEditableInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);
      const isNonScriptEditable = isEditableInput && !isScriptBlock;
      const anyModalOpen =
        titlePageModalOpen ||
        smartPasteOpen ||
        shortcutsModalOpen ||
        snapshotsModalOpen ||
        Boolean(confirmDialog);

      if (key === 'escape') {
        if (!e.defaultPrevented && zenMode && !anyModalOpen) {
          setZenMode(false);
        }
        return;
      }

      if (!mod) return;

      // Undo / Redo — never hijack native undo inside regular inputs/modals
      if (key === 'z' && !e.shiftKey) {
        if (isNonScriptEditable || anyModalOpen) return;
        e.preventDefault();
        shortcutHandlersRef.current.handleUndo();
        return;
      }

      if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
        if (isNonScriptEditable || anyModalOpen) return;
        e.preventDefault();
        shortcutHandlersRef.current.handleRedo();
        return;
      }

      // ⇧⌘V -> Smart Paste Intake modal
      if (key === 'v' && e.shiftKey) {
        e.preventDefault();
        setActiveView('screenplay');
        setSmartPasteOpen(true);
        return;
      }

      // ⌘1–⌘8 -> Switch active block element type on screenplay view
      if (
        !e.shiftKey &&
        !e.altKey &&
        activeView === 'screenplay' &&
        !anyModalOpen &&
        ELEMENT_SHORTCUTS[key]
      ) {
        e.preventDefault();
        if (activeBlock) {
          shortcutHandlersRef.current.handleChangeBlockElement(
            activeBlock.id,
            ELEMENT_SHORTCUTS[key]
          );
        }
        return;
      }

      if (key === 'n' && !e.shiftKey) {
        e.preventDefault();
        shortcutHandlersRef.current.handleNewScript();
      } else if (key === 'n' && e.shiftKey) {
        e.preventDefault();
        shortcutHandlersRef.current.handleNewWindow();
      } else if (key === 'o') {
        e.preventDefault();
        shortcutHandlersRef.current.handleOpenFile();
      } else if (key === 's') {
        e.preventDefault();
        shortcutHandlersRef.current.handleSave();
      } else if (key === 'p') {
        e.preventDefault();
        shortcutHandlersRef.current.handlePrintPdf();
      } else if (key === 'b') {
        e.preventDefault();
        setSidebarOpen((s) => !s);
      } else if (key === '\\') {
        e.preventDefault();
        setZenMode((z) => !z);
      } else if (key === '/') {
        e.preventDefault();
        setShortcutsModalOpen((open) => !open);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [
    activeView,
    activeBlock,
    zenMode,
    titlePageModalOpen,
    smartPasteOpen,
    shortcutsModalOpen,
    snapshotsModalOpen,
    confirmDialog,
  ]);

  return (
    <ErrorBoundary onEmergencyExport={handleExportFountain}>
      <div
        data-theme={theme}
        className="print-root h-screen w-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden"
      >
        {/* Hidden File Input for Native File Opening */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".slatedraft,.fountain,.fdx,.txt"
          className="hidden"
        />

        {/* Top Studio Titlebar with MenuBar */}
        <Titlebar
          titlePage={titlePage}
          onUpdateTitle={(title) => setTitlePage((prev) => ({ ...prev, title }))}
          activeView={activeView}
          onSelectView={setActiveView}
          language={language}
          onSelectLanguage={setLanguage}
          revisionColor={revisionColor}
          onSelectRevisionColor={setRevisionColor}
          scenesLocked={scenesLocked}
          onToggleSceneLocks={handleToggleSceneLocks}
          theme={theme}
          onSelectTheme={setTheme}
          zenMode={zenMode}
          onToggleZenMode={() => setZenMode((z) => !z)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
          activeElementType={activeBlock?.elementType ?? 'scene-heading'}
          onSelectElementType={(elType) => {
            if (activeBlock) {
              handleChangeBlockElement(activeBlock.id, elType);
            }
          }}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onNewScript={handleNewScript}
          onNewWindow={handleNewWindow}
          onOpenFile={handleOpenFile}
          onSave={handleSave}
          onSaveProject={handleSave}
          recentProjects={recentProjects}
          onOpenRecentProject={handleOpenRecentProject}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
          onOpenSnapshots={() => setSnapshotsModalOpen(true)}
          snapshotCount={snapshots.length}
          onOpenTitlePageModal={() => setTitlePageModalOpen(true)}
          onOpenTemplates={() => setActiveView('templates')}
          onOpenSmartPaste={() => {
            setActiveView('screenplay');
            setSmartPasteOpen(true);
          }}
          onToggleVoiceDrawer={() => setVoiceDrawerOpen((v) => !v)}
          voiceDrawerOpen={voiceDrawerOpen}
          onExportFountain={handleExportFountain}
          onExportFdx={handleExportFdx}
          onCopyWhatsApp={handleCopyWhatsApp}
          onPrintPdf={handlePrintPdf}
        />

      {/* First-Run Studio Quickstart Banner */}
      {!zenMode && (
        <QuickstartBanner
          onOpenTemplates={() => setActiveView('templates')}
          onOpenProduction={() => setActiveView('production')}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
        />
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {!zenMode && sidebarOpen && activeView === 'screenplay' && (
          <SidebarLeft
            blocks={blocks}
            activeBlockId={activeBlockId}
            activeElementType={activeBlock?.elementType ?? 'scene-heading'}
            onSelectElementType={(elType) => {
              if (activeBlock) {
                handleChangeBlockElement(activeBlock.id, elType);
              }
            }}
            onJumpToBlock={(blockId) => setActiveBlockId(blockId)}
            onAddNewScene={handleAddNewScene}
            onAddIntervalMarker={handleAddIntervalMarker}
          />
        )}

        {activeView === 'screenplay' && (
          <ScreenplayEditor
            blocks={blocks}
            activeBlockId={activeBlockId}
            onSelectBlock={setActiveBlockId}
            onUpdateBlockText={handleUpdateBlockText}
            onChangeBlockElement={handleChangeBlockElement}
            onInsertBlockAfter={handleInsertBlockAfter}
            onDeleteBlock={handleDeleteBlock}
            onToggleDualDialogue={handleToggleDualDialogue}
            onToggleOmitBlock={handleToggleOmitBlock}
            onReplaceAllBlocks={handleReplaceAllBlocks}
            onSmartPasteText={handleSmartPasteText}
            smartPasteOpen={smartPasteOpen}
            onOpenSmartPaste={handleOpenSmartPaste}
            onCloseSmartPaste={handleCloseSmartPaste}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            language={language}
            revisionColor={revisionColor}
            theme={theme}
            titlePage={titlePage}
            knownCharacterNames={knownCharacterNames}
          />
        )}

        {activeView === 'av-split' && (
          <AVSplitWorkspace
            rows={avRows}
            onUpdateRow={handleUpdateAvRow}
            onAddRowAfter={handleAddAvRowAfter}
            onDeleteRow={handleDeleteAvRow}
            theme={theme}
          />
        )}

        {activeView === 'beat-board' && (
          <BeatBoard
            blocks={blocks}
            onUpdateSceneSynopsis={handleUpdateSceneSynopsis}
            onUpdateSceneRasa={handleUpdateSceneRasa}
            onMoveScene={handleMoveScene}
            onJumpToSceneInEditor={(sceneId) => {
              setActiveBlockId(sceneId);
              setActiveView('screenplay');
            }}
            onAddSceneCard={handleAddNewScene}
            onInsertIntervalStructure={handleAddIntervalMarker}
          />
        )}

        {activeView === 'characters' && (
          <CharacterHub
            profiles={characters}
            analytics={analytics}
            onAddCharacter={handleAddCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
          />
        )}

        {activeView === 'production' && (
          <ProductionReports
            blocks={blocks}
            analytics={analytics}
            language={language}
            titlePage={titlePage}
            productionState={productionState}
            onUpdateProductionState={setProductionState}
            onUpdateSceneTags={handleUpdateSceneTags}
            onJumpToSceneInEditor={(sceneId) => {
              setActiveBlockId(sceneId);
              setActiveView('screenplay');
            }}
          />
        )}

        {activeView === 'templates' && (
          <TemplateGallery
            activeTemplateId={activeTemplateId}
            onApplyTemplate={handleApplyTemplate}
          />
        )}

        {/* Right Voice, Table-Read & Translation Drawer */}
        <VoiceTranslationDrawer
          open={voiceDrawerOpen}
          onClose={() => setVoiceDrawerOpen(false)}
          blocks={blocks}
          activeBlockId={activeBlockId}
          characters={characters}
          onAppendDictatedText={(txt) => {
            if (activeBlock) {
              const sep = activeBlock.text.endsWith(' ') || !activeBlock.text ? '' : ' ';
              const next = blocksRef.current.map((b) =>
                b.id === activeBlock.id
                  ? { ...b, text: `${b.text}${sep}${txt}`, revisionColor }
                  : b
              );
              commitBlocks(next, 'immediate');
              showToast('Dictation appended to active block');
            }
          }}
          onReplaceActiveBlockText={(txt) => {
            if (activeBlock) {
              const next = blocksRef.current.map((b) =>
                b.id === activeBlock.id ? { ...b, text: txt, revisionColor } : b
              );
              commitBlocks(next, 'immediate');
              showToast('Applied translated line to active block');
            }
          }}
        />
      </div>

      {/* Screenwriter Bottom Status Bar */}
      <footer className="no-print h-6 px-3 sm:px-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-muted)] flex items-center justify-between select-none z-30 overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="font-mono text-[var(--text-primary)]">
              {analytics.formattedEighths}
            </span>
            <span className="hidden sm:inline">
              ({analytics.totalScenes}{' '}
              {analytics.totalScenes === 1 ? 'Scene' : 'Scenes'} •{' '}
              {analytics.totalWords} Words)
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="hidden sm:inline">Screen Time:</span>
            <span className="font-mono text-amber-500 font-medium">
              {analytics.estimatedRuntimeMinutes} min
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span
            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]"
            aria-live="polite"
          >
            <Check
              className={`w-2.5 h-2.5 shrink-0 ${
                saveStatus === 'saving'
                  ? 'text-amber-500'
                  : isDirty
                  ? 'text-amber-400'
                  : 'text-emerald-500'
              }`}
            />
            <span>
              {saveStatus === 'saving'
                ? 'Saving…'
                : isDirty
                ? 'Unsaved (.slatedraft)'
                : 'Saved'}
            </span>
          </span>

          {scenesLocked && (
            <Badge variant="amber" mono className="py-0 text-[10px]">
              <Lock className="w-2.5 h-2.5 inline mr-1" />
              Locked
            </Badge>
          )}
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Globe className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="truncate max-w-[100px] sm:max-w-none">
              {LANGUAGE_METADATA[language].label}
            </span>
          </span>
        </div>
      </footer>

      {/* Title Page & Watermark Modal */}
      <TitlePageModal
        open={titlePageModalOpen}
        onClose={() => setTitlePageModalOpen(false)}
        titlePage={titlePage}
        onUpdateTitlePage={(patch) => setTitlePage((prev) => ({ ...prev, ...patch }))}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Draft Snapshots & Revision Comparison Modal */}
      <SnapshotsModal
        open={snapshotsModalOpen}
        onClose={() => setSnapshotsModalOpen(false)}
        snapshots={snapshots}
        currentBlocks={blocks}
        currentRevisionColor={revisionColor}
        titlePage={titlePage}
        onSaveSnapshot={handleSaveSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
      />

      {/* Studio Confirmation Modal */}
      <ConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        danger={confirmDialog?.danger}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-8 right-6 z-50 bg-[var(--bg-elevated)] border border-amber-500/50 text-[var(--text-primary)] px-3.5 py-2 rounded-lg shadow-2xl flex items-center gap-2 text-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
