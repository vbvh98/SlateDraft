import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Columns,
  EyeOff,
  Lock,
  Music,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  ElementType,
  IndicLanguage,
  RevisionColor,
  ScriptBlock,
  StudioTheme,
  TitlePageData,
  TransliterationResult,
} from '../types/screenplay';
import { invokeRustTransliterate } from '../services/rustBridge';
import { LANGUAGE_METADATA } from '../services/transliterationEngine';
import { EditingToolbar } from './EditingToolbar';
import {
  computeFindMatches,
  FindElementFilter,
  FindReplaceBar,
} from './FindReplaceBar';
import { Badge, Button, IconButton, Modal, Textarea } from './ui';

export interface ScreenplayEditorProps {
  blocks: ScriptBlock[];
  activeBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateBlockText: (id: string, text: string) => void;
  onChangeBlockElement: (id: string, elementType: ElementType) => void;
  onInsertBlockAfter: (afterId: string, elementType: ElementType) => string;
  onDeleteBlock: (id: string) => void;
  onToggleDualDialogue: (id: string) => void;
  onToggleOmitBlock: (id: string) => void;
  onSmartPasteText: (rawText: string) => void;
  onReplaceAllBlocks?: (nextBlocks: ScriptBlock[]) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  language: IndicLanguage;
  revisionColor: RevisionColor;
  theme: StudioTheme;
  titlePage: TitlePageData;
  knownCharacterNames: string[];
  smartPasteOpen?: boolean;
  onOpenSmartPaste?: () => void;
  onCloseSmartPaste?: () => void;
}

const LINES_PER_PAGE = 54;

function normalizeCharacterName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function estimateBlockLines(block: ScriptBlock): number {
  if (block.omitted) return 0;

  const charsPerLine: Record<ElementType, number> = {
    'scene-heading': 60,
    action: 60,
    character: 35,
    parenthetical: 25,
    dialogue: 35,
    transition: 25,
    shot: 60,
    'song-lyric': 42,
    'section-act': 50,
    note: 55,
  };

  const spacingLines: Record<ElementType, number> = {
    'scene-heading': 2,
    action: 1,
    character: 1,
    parenthetical: 0,
    dialogue: 1,
    transition: 2,
    shot: 1,
    'song-lyric': 1,
    'section-act': 2,
    note: 1,
  };

  const width = charsPerLine[block.elementType] ?? 60;
  const paragraphs = block.text.split('\n');
  let wrappedLines = 0;
  for (const para of paragraphs) {
    wrappedLines += Math.max(1, Math.ceil(para.length / width));
  }
  return wrappedLines + (spacingLines[block.elementType] ?? 1);
}

function replaceAllInText(
  text: string,
  query: string,
  replacement: string,
  matchCase: boolean
): string {
  if (!query) return text;
  if (matchCase) {
    return text.split(query).join(replacement);
  }
  const needle = query.toLowerCase();
  const lower = text.toLowerCase();
  const needleLen = needle.length;
  let result = '';
  let lastIdx = 0;
  let idx = lower.indexOf(needle, lastIdx);
  while (idx !== -1) {
    result += text.slice(lastIdx, idx) + replacement;
    lastIdx = idx + needleLen;
    idx = lower.indexOf(needle, lastIdx);
  }
  result += text.slice(lastIdx);
  return result;
}

const ELEMENT_CYCLE_ORDER: ElementType[] = [
  'scene-heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
  'shot',
  'song-lyric',
  'section-act',
  'note',
];

const NEXT_ELEMENT_ON_ENTER: Record<ElementType, ElementType> = {
  'scene-heading': 'action',
  action: 'action',
  character: 'dialogue',
  parenthetical: 'dialogue',
  dialogue: 'character',
  transition: 'scene-heading',
  shot: 'action',
  'song-lyric': 'song-lyric',
  'section-act': 'scene-heading',
  note: 'action',
};

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({
  blocks,
  activeBlockId,
  onSelectBlock,
  onUpdateBlockText,
  onChangeBlockElement,
  onInsertBlockAfter,
  onDeleteBlock,
  onToggleDualDialogue,
  onToggleOmitBlock,
  onSmartPasteText,
  onReplaceAllBlocks,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  language,
  theme,
  titlePage,
  knownCharacterNames,
  smartPasteOpen,
  onOpenSmartPaste,
  onCloseSmartPaste,
}) => {
  const [translitPopup, setTranslitPopup] = useState<{
    blockId: string;
    result: TransliterationResult;
  } | null>(null);
  const [internalPasteModalOpen, setInternalPasteModalOpen] = useState(false);
  const [pasteRawInput, setPasteRawInput] = useState('');

  // Find & Replace state
  const [findOpen, setFindOpen] = useState(false);
  const [findFocusTarget, setFindFocusTarget] = useState<'find' | 'replace'>('find');
  const [findQuery, setFindQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [findElementFilter, setFindElementFilter] = useState<FindElementFilter>('all');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const inputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pendingCursorPosRef = useRef<'start' | 'end' | null>(null);

  const findMatches = useMemo(
    () =>
      findOpen
        ? computeFindMatches(blocks, findQuery, findMatchCase, findElementFilter)
        : [],
    [findOpen, blocks, findQuery, findMatchCase, findElementFilter]
  );

  const safeActiveMatchIndex =
    findMatches.length > 0 ? Math.min(activeMatchIndex, findMatches.length - 1) : 0;
  const activeMatch = findMatches.length > 0 ? findMatches[safeActiveMatchIndex] : null;

  const matchedBlockIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of findMatches) {
      set.add(m.blockId);
    }
    return set;
  }, [findMatches]);

  // Live pagination breaks (~54 estimated lines per page)
  const pageBreakBeforeBlockId = useMemo(() => {
    const breaks = new Map<string, number>();
    let runningLines = 0;
    let currentPage = 1;

    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      const blockLines = estimateBlockLines(block);
      if (blockLines === 0) continue;

      if (i > 0 && runningLines + blockLines > currentPage * LINES_PER_PAGE) {
        currentPage = Math.max(currentPage + 1, Math.floor(runningLines / LINES_PER_PAGE) + 1);
        breaks.set(block.id, currentPage);
      }

      runningLines += blockLines;
    }

    return breaks;
  }, [blocks]);

  // Memoized (CONT'D) set for consecutive dialogue cues by the same character within a scene
  const contdBlockIds = useMemo(() => {
    const set = new Set<string>();
    let lastSpeaker: string | null = null;

    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (block.omitted) continue;

      if (block.elementType === 'scene-heading' || block.elementType === 'section-act') {
        lastSpeaker = null;
        continue;
      }

      if (block.elementType === 'character') {
        const normalized = normalizeCharacterName(block.text);
        if (normalized) {
          if (
            lastSpeaker === normalized &&
            !block.text.toUpperCase().includes("CONT'D")
          ) {
            set.add(block.id);
          }
          lastSpeaker = normalized;
        }
      }
    }

    return set;
  }, [blocks]);

  // Memoized O(1) block index lookup for responsive navigation on 150+ page scripts
  const blockIndexById = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < blocks.length; i += 1) {
      map.set(blocks[i].id, i);
    }
    return map;
  }, [blocks]);

  // Keyboard shortcuts: ⌘F / Ctrl+F (Find) and ⌥⌘F / Ctrl+H (Find & Replace)
  useEffect(() => {
    const handleFindShortcut = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'f' && !e.shiftKey) {
        e.preventDefault();
        setFindFocusTarget(e.altKey ? 'replace' : 'find');
        setFindOpen(true);
        return;
      }

      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && key === 'h') {
        e.preventDefault();
        setFindFocusTarget('replace');
        setFindOpen(true);
      }
    };

    window.addEventListener('keydown', handleFindShortcut);
    return () => window.removeEventListener('keydown', handleFindShortcut);
  }, []);

  // Scroll the active Find match into view without stealing focus from the Find input
  useEffect(() => {
    if (!findOpen || !activeMatch) return;
    const el = inputRefs.current[activeMatch.blockId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [findOpen, activeMatch]);

  const handleNextMatch = () => {
    if (findMatches.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % findMatches.length);
  };

  const handlePrevMatch = () => {
    if (findMatches.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + findMatches.length) % findMatches.length);
  };

  const handleReplaceCurrent = () => {
    if (!activeMatch) return;
    const targetBlock = blocks.find((b) => b.id === activeMatch.blockId);
    if (!targetBlock) return;
    const updatedText =
      targetBlock.text.slice(0, activeMatch.start) +
      replaceText +
      targetBlock.text.slice(activeMatch.end);
    onUpdateBlockText(targetBlock.id, updatedText);
  };

  const handleReplaceAll = () => {
    if (!findQuery || findMatches.length === 0) return;

    const changedBlocks: Array<{ id: string; text: string }> = [];
    const nextBlocks = blocks.map((block) => {
      if (
        findElementFilter !== 'all' &&
        block.elementType !== (findElementFilter as ElementType)
      ) {
        return block;
      }
      const replaced = replaceAllInText(block.text, findQuery, replaceText, findMatchCase);
      if (replaced !== block.text) {
        changedBlocks.push({ id: block.id, text: replaced });
        return { ...block, text: replaced };
      }
      return block;
    });

    if (changedBlocks.length === 0) return;

    if (onReplaceAllBlocks) {
      onReplaceAllBlocks(nextBlocks);
    } else {
      for (const item of changedBlocks) {
        onUpdateBlockText(item.id, item.text);
      }
    }
    setActiveMatchIndex(0);
  };

  const handleCloseFind = () => {
    const matchToFocus = activeMatch;
    setFindOpen(false);
    if (matchToFocus) {
      onSelectBlock(matchToFocus.blockId);
      setTimeout(() => {
        const el = inputRefs.current[matchToFocus.blockId];
        if (el) {
          el.focus();
          el.setSelectionRange(matchToFocus.start, matchToFocus.end);
        }
      }, 0);
    }
  };

  const isPasteModalOpen =
    smartPasteOpen !== undefined ? smartPasteOpen : internalPasteModalOpen;

  const openPasteModal = () => {
    if (onOpenSmartPaste) {
      onOpenSmartPaste();
    } else {
      setInternalPasteModalOpen(true);
    }
  };

  const closePasteModal = () => {
    if (onCloseSmartPaste) {
      onCloseSmartPaste();
    } else {
      setInternalPasteModalOpen(false);
    }
  };

  useEffect(() => {
    if (!activeBlockId) return;
    const el = inputRefs.current[activeBlockId];
    if (!el) return;

    const wasAlreadyFocused = document.activeElement === el;
    if (!wasAlreadyFocused) {
      el.focus({ preventScroll: true });
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const desiredPos = pendingCursorPosRef.current;
    if (desiredPos === 'start') {
      el.setSelectionRange(0, 0);
    } else if (desiredPos === 'end') {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    } else if (!wasAlreadyFocused) {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
    pendingCursorPosRef.current = null;
  }, [activeBlockId]);

  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(26, el.scrollHeight)}px`;
  };

  const blocksStructureKey = `${blocks.length}:${blocks[0]?.id ?? ''}:${
    blocks[blocks.length - 1]?.id ?? ''
  }`;

  useEffect(() => {
    Object.values(inputRefs.current).forEach((el) => adjustHeight(el));
  }, [blocksStructureKey]);

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: ScriptBlock
  ) => {
    const textarea = e.currentTarget;

    // Handle active Transliteration Popup interactions
    if (translitPopup && translitPopup.blockId === block.id) {
      if (['1', '2', '3', '4'].includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const idx = Number(e.key) - 1;
        const candidate = translitPopup.result.candidates[idx];
        if (candidate) {
          e.preventDefault();
          applyCandidateReplacement(block, translitPopup.result.primary, candidate);
          setTranslitPopup(null);
          return;
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setTranslitPopup(null);
        return;
      } else if (e.key === 'Backspace') {
        setTranslitPopup(null);
      } else if (
        e.key.length === 1 &&
        e.key !== ' ' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        setTranslitPopup(null);
      }
    } else if (e.key === 'Escape' && translitPopup) {
      e.preventDefault();
      e.stopPropagation();
      setTranslitPopup(null);
      return;
    }

    // ArrowUp / ArrowDown seamless inter-block navigation
    if (
      e.key === 'ArrowUp' &&
      !e.shiftKey &&
      !e.altKey &&
      !e.metaKey &&
      !e.ctrlKey
    ) {
      const selStart = textarea.selectionStart ?? 0;
      const selEnd = textarea.selectionEnd ?? 0;
      const onFirstLine = selStart === 0 || !block.text.slice(0, selStart).includes('\n');
      if (selStart === selEnd && onFirstLine) {
        const blockIndex = blockIndexById.get(block.id) ?? -1;
        if (blockIndex > 0) {
          e.preventDefault();
          setTranslitPopup(null);
          const prevBlock = blocks[blockIndex - 1];
          pendingCursorPosRef.current = 'end';
          onSelectBlock(prevBlock.id);
          return;
        }
      }
    }

    if (
      e.key === 'ArrowDown' &&
      !e.shiftKey &&
      !e.altKey &&
      !e.metaKey &&
      !e.ctrlKey
    ) {
      const selStart = textarea.selectionStart ?? 0;
      const selEnd = textarea.selectionEnd ?? 0;
      const onLastLine =
        selEnd === block.text.length || !block.text.slice(selEnd).includes('\n');
      if (selStart === selEnd && onLastLine) {
        const blockIndex = blockIndexById.get(block.id) ?? -1;
        if (blockIndex !== -1 && blockIndex < blocks.length - 1) {
          e.preventDefault();
          setTranslitPopup(null);
          const nextBlock = blocks[blockIndex + 1];
          pendingCursorPosRef.current = 'start';
          onSelectBlock(nextBlock.id);
          return;
        }
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const idx = ELEMENT_CYCLE_ORDER.indexOf(block.elementType);
      const nextIdx = e.shiftKey
        ? (idx - 1 + ELEMENT_CYCLE_ORDER.length) % ELEMENT_CYCLE_ORDER.length
        : (idx + 1) % ELEMENT_CYCLE_ORDER.length;
      onChangeBlockElement(block.id, ELEMENT_CYCLE_ORDER[nextIdx]);
      setTranslitPopup(null);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setTranslitPopup(null);

      // Final Draft standard: Enter on an empty character, parenthetical, or dialogue converts it to action
      if (
        block.text.trim().length === 0 &&
        (block.elementType === 'character' ||
          block.elementType === 'parenthetical' ||
          block.elementType === 'dialogue')
      ) {
        onChangeBlockElement(block.id, 'action');
        return;
      }

      const nextType = NEXT_ELEMENT_ON_ENTER[block.elementType] ?? 'action';
      const newId = onInsertBlockAfter(block.id, nextType);
      pendingCursorPosRef.current = 'start';
      setTimeout(() => {
        const nextEl = inputRefs.current[newId];
        if (nextEl) {
          nextEl.focus();
          nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 15);
      return;
    }

    if (e.key === 'Backspace' && block.text.length === 0 && blocks.length > 1) {
      e.preventDefault();
      pendingCursorPosRef.current = 'end';
      onDeleteBlock(block.id);
      setTranslitPopup(null);
      return;
    }

    if (e.key === ' ' && language !== 'english') {
      const cursor = textarea.selectionStart ?? block.text.length;
      const beforeCursor = block.text.slice(0, cursor);
      const afterCursor = block.text.slice(cursor);
      const match = beforeCursor.match(/([A-Za-z]+)$/);

      if (match) {
        const rawWord = match[1];
        if (
          block.elementType === 'scene-heading' &&
          ['INT', 'EXT', 'DAY', 'NIGHT', 'CONTINUOUS', 'LATER'].includes(rawWord.toUpperCase())
        ) {
          return;
        }

        e.preventDefault();
        const res = await invokeRustTransliterate(rawWord, language);
        const newBefore =
          beforeCursor.slice(0, beforeCursor.length - rawWord.length) + res.primary + ' ';
        const updatedText = newBefore + afterCursor;
        onUpdateBlockText(block.id, updatedText);
        if (res.candidates.length > 1) {
          setTranslitPopup({ blockId: block.id, result: res });
        } else {
          setTranslitPopup(null);
        }

        setTimeout(() => {
          const el = inputRefs.current[block.id];
          if (el) {
            const newPos = newBefore.length;
            el.setSelectionRange(newPos, newPos);
          }
        }, 5);
      }
    }
  };

  const applyCandidateReplacement = (
    block: ScriptBlock,
    currentInserted: string,
    chosenCandidate: string
  ) => {
    const targetSuffix = `${currentInserted} `;
    const idx = block.text.lastIndexOf(targetSuffix);
    if (idx !== -1) {
      const updated =
        block.text.slice(0, idx) +
        `${chosenCandidate} ` +
        block.text.slice(idx + targetSuffix.length);
      onUpdateBlockText(block.id, updated);
    }
  };

  const appendQuickToken = (block: ScriptBlock, token: string) => {
    const updated =
      block.text.endsWith(' ') || block.text.length === 0
        ? `${block.text}${token}`
        : `${block.text} ${token}`;
    onUpdateBlockText(block.id, updated);
    const el = inputRefs.current[block.id];
    if (el) {
      el.focus();
      const len = updated.length;
      setTimeout(() => el.setSelectionRange(len, len), 0);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-block-row="true"]')) return;
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock) return;
    pendingCursorPosRef.current = 'end';
    onSelectBlock(lastBlock.id);
    const el = inputRefs.current[lastBlock.id];
    if (el) {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  };

  const activeBlock = useMemo(() => {
    if (!activeBlockId) return blocks[0];
    const idx = blockIndexById.get(activeBlockId);
    return idx !== undefined ? blocks[idx] : blocks[0];
  }, [activeBlockId, blockIndexById, blocks]);
  const hasContextualTokens =
    activeBlock?.elementType === 'scene-heading' ||
    activeBlock?.elementType === 'character' ||
    activeBlock?.elementType === 'transition';

  const isLightPaper = theme === 'sahitya';

  const pageThemeClasses =
    theme === 'sahitya'
      ? 'bg-[#FBF8F3] text-[#1C1917] border-stone-300 shadow-xl shadow-stone-950/15'
      : theme === 'neel'
        ? 'bg-[#111822] text-slate-100 border-slate-800 shadow-2xl shadow-black/60'
        : 'bg-[#181816] text-stone-100 border-stone-800/90 shadow-2xl shadow-black/70';

  const accentTextClass = isLightPaper ? 'text-amber-700' : 'text-amber-400';

  const getBlockLayoutClasses = (type: ElementType, isDual: boolean): string => {
    switch (type) {
      case 'scene-heading':
        return 'font-bold uppercase tracking-wide py-1.5 px-2 rounded bg-amber-500/10 border-l-2 border-amber-500 mt-5 mb-2';
      case 'action':
        return 'my-1.5 leading-relaxed';
      case 'character':
        return `uppercase font-semibold tracking-wider mt-4 mb-0.5 ${
          isDual
            ? `ml-[12%] border-l-2 border-amber-500/45 pl-2.5 ${accentTextClass}`
            : 'ml-[34%] w-[45%]'
        }`;
      case 'parenthetical':
        return 'ml-[27%] w-[42%] italic opacity-80 my-0.5 text-[14px]';
      case 'dialogue':
        return `mb-2 leading-relaxed ${
          isDual
            ? 'ml-[8%] w-[82%] border-l-2 border-amber-500/35 pl-2.5'
            : 'ml-[18%] w-[62%]'
        }`;
      case 'transition':
        return 'uppercase font-semibold text-right tracking-wider my-3 pr-4';
      case 'shot':
        return `uppercase font-semibold tracking-wide my-2 ${accentTextClass}`;
      case 'song-lyric':
        return 'ml-[20%] w-[65%] italic border-l-2 border-amber-500/50 pl-3 py-1 my-2 bg-amber-500/5 rounded-r';
      case 'section-act':
        return `uppercase font-bold text-center tracking-widest py-2 my-5 border-y border-amber-500/30 text-xs ${accentTextClass}`;
      case 'note':
        return 'mx-[10%] my-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-xs italic';
    }
  };

  const getPlaceholderForType = (type: ElementType): string => {
    switch (type) {
      case 'scene-heading':
        return 'INT. LOCATION - DAY';
      case 'action':
        return 'Describe scene action, setting, and visual movement...';
      case 'character':
        return 'CHARACTER NAME';
      case 'parenthetical':
        return '(beat / tone direction)';
      case 'dialogue':
        return language === 'english'
          ? 'Character dialogue...'
          : `Type dialogue in ${LANGUAGE_METADATA[language].label} (press Space to transliterate)...`;
      case 'transition':
        return 'CUT TO:';
      case 'shot':
        return 'ANGLE ON / CLOSE UP:';
      case 'song-lyric':
        return '♪ Lyric stanza or musical cue...';
      case 'section-act':
        return 'ACT I / PRE-INTERVAL BLOCK';
      case 'note':
        return 'Script supervisor or writer note (omitted from standard export)...';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-app)] relative transition-colors">
      {/* Editing Shortcut & Error Correction Guide Toolbar */}
      <EditingToolbar
        activeElementType={activeBlock?.elementType ?? 'action'}
        onChangeElementType={(type) => {
          if (activeBlock) onChangeBlockElement(activeBlock.id, type);
        }}
        language={language}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        isDualDialogue={activeBlock?.isDualDialogue}
        onToggleDualDialogue={() => {
          if (activeBlock) onToggleDualDialogue(activeBlock.id);
        }}
        onOpenSmartPaste={openPasteModal}
      />

      {/* Inline Find & Replace Bar (⌘F / ⌥⌘F / Ctrl+H) */}
      <FindReplaceBar
        open={findOpen}
        focusTarget={findFocusTarget}
        query={findQuery}
        replaceText={replaceText}
        matchCase={findMatchCase}
        elementFilter={findElementFilter}
        matchCount={findMatches.length}
        activeMatchIndex={safeActiveMatchIndex}
        onQueryChange={(val) => {
          setFindQuery(val);
          setActiveMatchIndex(0);
        }}
        onReplaceTextChange={setReplaceText}
        onToggleMatchCase={() => {
          setFindMatchCase((prev) => !prev);
          setActiveMatchIndex(0);
        }}
        onElementFilterChange={(filter) => {
          setFindElementFilter(filter);
          setActiveMatchIndex(0);
        }}
        onPrevMatch={handlePrevMatch}
        onNextMatch={handleNextMatch}
        onReplaceCurrent={handleReplaceCurrent}
        onReplaceAll={handleReplaceAll}
        onClose={handleCloseFind}
      />

      {/* Contextual Smart Formatting & Autocomplete Strip (only when active block has quick tokens) */}
      {hasContextualTokens && activeBlock && (
        <div className="no-print h-9 px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)] flex items-center gap-2 text-xs overflow-x-auto select-none transition-colors">
          <Badge variant="amber" uppercase className="shrink-0">
            {activeBlock.elementType.replace('-', ' ')}
          </Badge>

          {activeBlock.elementType === 'scene-heading' && (
            <div className="flex items-center gap-1">
              {['INT. ', 'EXT. ', 'INT./EXT. ', ' - DAY', ' - NIGHT', ' - CONTINUOUS', ' - DUSK'].map(
                (tok) => (
                  <Button
                    key={tok}
                    variant="secondary"
                    size="xs"
                    onClick={() => appendQuickToken(activeBlock, tok)}
                    className="font-mono"
                  >
                    {tok.trim()}
                  </Button>
                )
              )}
            </div>
          )}

          {activeBlock.elementType === 'character' && (
            <div className="flex items-center gap-1">
              {['(V.O.)', '(O.S.)', "(CONT'D)", '(ON PHONE)', '(SUBTITLED)'].map((ext) => (
                <Button
                  key={ext}
                  variant="secondary"
                  size="xs"
                  onClick={() => appendQuickToken(activeBlock, ext)}
                  className="font-mono"
                >
                  {ext}
                </Button>
              ))}
              {knownCharacterNames.slice(0, 5).map((name) => (
                <Button
                  key={name}
                  variant="amber-soft"
                  size="xs"
                  onClick={() => onUpdateBlockText(activeBlock.id, name)}
                  className="font-mono"
                >
                  {name}
                </Button>
              ))}
            </div>
          )}

          {activeBlock.elementType === 'transition' && (
            <div className="flex items-center gap-1">
              {[
                'CUT TO:',
                'SMASH CUT TO:',
                'DISSOLVE TO:',
                'MATCH CUT TO:',
                'INTERVAL',
                'FADE OUT.',
              ].map((tr) => (
                <Button
                  key={tr}
                  variant="secondary"
                  size="xs"
                  onClick={() => onUpdateBlockText(activeBlock.id, tr)}
                  className="font-mono"
                >
                  {tr}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Phonetic Transliteration Candidate Bar */}
      {translitPopup && (
        <div
          role="region"
          aria-label="Phonetic transliteration candidates"
          className="no-print absolute top-12 right-6 z-40 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg px-3 py-2 shadow-xl flex flex-wrap items-center gap-2 text-[var(--text-primary)]"
        >
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {LANGUAGE_METADATA[language].nativeLabel}
          </span>
          {translitPopup.result.candidates.slice(0, 4).map((cand, idx) => (
            <Button
              key={cand + idx}
              variant={idx === 0 ? 'primary' : 'secondary'}
              size="xs"
              onClick={() => {
                const target = blocks.find((b) => b.id === translitPopup.blockId);
                if (target) {
                  applyCandidateReplacement(target, translitPopup.result.primary, cand);
                }
                setTranslitPopup(null);
                const el = inputRefs.current[translitPopup.blockId];
                if (el) el.focus();
              }}
            >
              {idx + 1}. {cand}
            </Button>
          ))}
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            1–4 or Esc · {translitPopup.result.latencyMicros}µs
          </span>
          <IconButton
            size="xs"
            icon={<X className="w-3 h-3" />}
            onClick={() => setTranslitPopup(null)}
            aria-label="Dismiss transliteration suggestions"
            title="Dismiss (Esc)"
          />
        </div>
      )}

      {/* Main Scrollable US-Letter Screenplay Page Surface */}
      <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-8 flex justify-center">
        <div
          onClick={handleCanvasClick}
          className={`script-page-surface relative w-full max-w-[820px] min-h-[1056px] rounded-sm border px-10 sm:px-16 py-12 font-script text-[15px] transition-colors cursor-text ${pageThemeClasses}`}
        >
          {titlePage.watermarkEnabled && titlePage.watermarkText.trim() && (
            <div
              aria-hidden="true"
              className="script-watermark-overlay pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden z-0"
            >
              <span
                style={{ transform: 'rotate(-35deg)' }}
                className="text-3xl sm:text-4xl font-bold uppercase tracking-[0.25em] opacity-[0.06] whitespace-nowrap"
              >
                {titlePage.watermarkText.trim()}
              </span>
            </div>
          )}

          <div className="relative z-10">
            {blocks.map((block) => {
              const isFocused = activeBlockId === block.id;
              const isRevised = block.revisionColor !== 'white';
              const showContd =
                block.elementType === 'character' && contdBlockIds.has(block.id);
              const showDualPill =
                block.isDualDialogue &&
                (block.elementType === 'character' || block.elementType === 'dialogue');
              const pageBreakNumber = pageBreakBeforeBlockId.get(block.id);
              const isActiveMatchBlock = findOpen && activeMatch?.blockId === block.id;
              const isAnyMatchBlock = findOpen && matchedBlockIds.has(block.id);

              return (
                <React.Fragment key={block.id}>
                  {pageBreakNumber !== undefined && (
                    <div
                      aria-label={`Page ${pageBreakNumber}`}
                      className="no-print my-6 flex items-center gap-3 select-none"
                    >
                      <div className="flex-1 border-t border-dashed border-[var(--border-subtle)] opacity-80" />
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]">
                        Page {pageBreakNumber}
                      </span>
                      <div className="flex-1 border-t border-dashed border-[var(--border-subtle)] opacity-80" />
                    </div>
                  )}

                  <div
                    data-block-row="true"
                    data-element-type={block.elementType}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBlock(block.id);
                    }}
                    className={`group relative flex items-start gap-2 rounded transition-colors ${
                      block.omitted ? 'opacity-40 line-through' : ''
                    } ${
                      isActiveMatchBlock
                        ? 'ring-1 ring-[var(--accent)] bg-[var(--accent-soft)]'
                        : isAnyMatchBlock
                          ? 'bg-[var(--accent-soft)]/40'
                          : ''
                    }`}
                  >
                  {/* Left Gutter: Scene Number, Song Icon, or Dual Dialogue Pill */}
                  <div className="w-12 shrink-0 pt-2 text-right select-none font-mono text-xs opacity-75 flex flex-col items-end gap-1">
                    {block.elementType === 'scene-heading' && block.sceneNumber ? (
                      <span className="inline-flex items-center gap-0.5 font-bold">
                        {block.sceneNumber}
                        {block.locked && <Lock className="w-2.5 h-2.5 text-amber-500 inline" />}
                      </span>
                    ) : block.elementType === 'song-lyric' ? (
                      <Music className="w-3.5 h-3.5 text-amber-500 inline" />
                    ) : showDualPill ? (
                      <span
                        title="Dual Dialogue block (paired side-by-side in export)"
                        className={`no-print inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-amber-500/15 border border-amber-500/35 ${
                          isLightPaper ? 'text-amber-700' : 'text-amber-300'
                        }`}
                      >
                        DUAL
                      </span>
                    ) : null}
                  </div>

                  {/* Center Editable Screenplay Element */}
                  <div
                    className={`flex-1 ${getBlockLayoutClasses(
                      block.elementType,
                      block.isDualDialogue
                    )} ${showContd ? 'flex items-baseline gap-1.5' : ''}`}
                  >
                    <textarea
                      ref={(el) => {
                        inputRefs.current[block.id] = el;
                      }}
                      data-script-block="true"
                      rows={1}
                      value={block.text}
                      onFocus={() => onSelectBlock(block.id)}
                      onChange={(e) => {
                        onUpdateBlockText(block.id, e.target.value);
                        adjustHeight(e.target);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, block)}
                      placeholder={getPlaceholderForType(block.elementType)}
                      className={`${
                        showContd ? 'min-w-0 flex-1' : 'w-full'
                      } resize-none overflow-hidden bg-transparent focus:outline-none placeholder:opacity-35 ${
                        block.elementType === 'scene-heading' ||
                        block.elementType === 'character' ||
                        block.elementType === 'transition' ||
                        block.elementType === 'shot' ||
                        block.elementType === 'section-act'
                          ? 'uppercase'
                          : ''
                      }`}
                    />
                    {showContd && (
                      <span
                        data-contd-indicator="true"
                        aria-label="Continued dialogue"
                        className="shrink-0 font-script text-[13px] font-normal tracking-wider opacity-55 select-none pointer-events-none"
                      >
                        (CONT&apos;D)
                      </span>
                    )}
                  </div>

                  {/* Right Gutter: Hover/Focus Quick Actions & Right-Margin Revision Asterisk */}
                  <div className="w-24 shrink-0 pt-1.5 flex items-center justify-end gap-1 select-none">
                    <div
                      className={`no-print flex items-center gap-0.5 transition-opacity ${
                        isFocused
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                      }`}
                    >
                      {(block.elementType === 'character' ||
                        block.elementType === 'dialogue') && (
                        <IconButton
                          size="xs"
                          active={block.isDualDialogue}
                          icon={<Columns className="w-3 h-3" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleDualDialogue(block.id);
                          }}
                          title="Toggle Dual Dialogue (Side-by-Side)"
                          aria-label="Toggle dual dialogue"
                        />
                      )}

                      <IconButton
                        size="xs"
                        icon={<EyeOff className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleOmitBlock(block.id);
                        }}
                        title={block.omitted ? 'Restore Block' : 'Omit Block'}
                        aria-label={block.omitted ? 'Restore block' : 'Omit block'}
                      />

                      <IconButton
                        size="xs"
                        icon={<Plus className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInsertBlockAfter(
                            block.id,
                            NEXT_ELEMENT_ON_ENTER[block.elementType] ?? 'action'
                          );
                        }}
                        title="Insert Block Below (Enter)"
                        aria-label="Insert block below"
                      />

                      {blocks.length > 1 && (
                        <IconButton
                          size="xs"
                          variant="danger"
                          icon={<Trash2 className="w-3 h-3" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBlock(block.id);
                          }}
                          title="Delete Block"
                          aria-label="Delete block"
                        />
                      )}
                    </div>

                    <span
                      data-revision-asterisk={isRevised ? 'true' : undefined}
                      aria-hidden={!isRevised}
                      title={
                        isRevised
                          ? `Revised (${block.revisionColor.toUpperCase()} Draft)`
                          : undefined
                      }
                      className={`w-3.5 text-right font-mono font-bold text-sm leading-none shrink-0 ${
                        isRevised
                          ? 'text-amber-500 opacity-100'
                          : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      *
                    </span>
                  </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smart Paste Intake Modal via shared Modal component */}
      <Modal
        open={isPasteModalOpen}
        onClose={closePasteModal}
        title="Smart Script Intake (Heuristic & Fountain Parser)"
        subtitle="Paste raw screenplay text from emails, Word/Docs, or Fountain files. SlateDraft automatically detects Scene Headings (INT./EXT.), Character Cues, Parentheticals, Dialogue, Transitions, and Lyrics (~)."
        icon={<Sparkles className="w-4 h-4" />}
        footer={
          <>
            <Button variant="secondary" onClick={closePasteModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!pasteRawInput.trim()}
              onClick={() => {
                if (pasteRawInput.trim()) {
                  onSmartPasteText(pasteRawInput);
                  setPasteRawInput('');
                  closePasteModal();
                }
              }}
            >
              Parse & Append to Script
            </Button>
          </>
        }
      >
        <Textarea
          mono
          rows={10}
          value={pasteRawInput}
          onChange={(e) => setPasteRawInput(e.target.value)}
          placeholder={`INT. STUDIO FLOOR - NIGHT\n\nCamera tracks across the soundstage.\n\nDIRECTOR\n(into talkback)\nRoll sound.`}
        />
      </Modal>
    </div>
  );
};
