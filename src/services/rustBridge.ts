import {
  IndicLanguage,
  RevisionColor,
  ScriptAnalyticsReport,
  ScriptBlock,
  TitlePageData,
  TransliterationResult,
} from '../types/screenplay';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  }
}

export function isTauriDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__?.invoke);
}

/**
 * Invokes a native Rust Tauri command. Throws if not running inside the Tauri
 * desktop runtime or if the Rust command returns an error.
 */
export async function invokeTauri<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauriDesktopRuntime() || !window.__TAURI_INTERNALS__) {
    throw new Error(
      `Cannot invoke "${cmd}": SlateDraft Studio requires the Tauri desktop runtime.`
    );
  }
  return window.__TAURI_INTERNALS__.invoke<T>(cmd, args);
}

export async function invokeRustTransliterate(
  word: string,
  language: IndicLanguage
): Promise<TransliterationResult> {
  return invokeTauri<TransliterationResult>('local_transliterate_word', {
    word,
    language,
  });
}

export async function invokeRustAnalytics(
  blocks: ScriptBlock[],
  language: IndicLanguage
): Promise<ScriptAnalyticsReport> {
  return invokeTauri<ScriptAnalyticsReport>('compute_script_analytics', {
    blocks,
    language,
  });
}

export async function invokeRustExportFountain(
  titlePage: TitlePageData,
  blocks: ScriptBlock[]
): Promise<string> {
  return invokeTauri<string>('export_script_fountain', {
    title: titlePage.title,
    author: titlePage.writtenBy,
    blocks,
  });
}

export async function invokeRustExportFdx(
  titlePage: TitlePageData,
  blocks: ScriptBlock[]
): Promise<string> {
  return invokeTauri<string>('export_script_fdx', {
    title: titlePage.title,
    blocks,
  });
}

export async function invokeRustParseScript(raw: string): Promise<ScriptBlock[]> {
  return invokeTauri<ScriptBlock[]>('parse_script_text', { raw });
}

export async function invokeRustSceneLocks(
  blocks: ScriptBlock[],
  lockMode: boolean
): Promise<ScriptBlock[]> {
  return invokeTauri<ScriptBlock[]>('update_scene_locks', {
    blocks,
    lockMode,
  });
}

export async function invokeRustTranslateLine(
  text: string,
  targetLanguage: IndicLanguage
): Promise<string> {
  return invokeTauri<string>('translate_script_line', {
    text,
    targetLanguage,
  });
}

export async function invokeRustExtractFdxTitlePage(
  xml: string
): Promise<Partial<TitlePageData>> {
  return invokeTauri<Partial<TitlePageData>>('extract_fdx_title_page', { xml });
}

export async function invokeRustParseFdxXml(
  xml: string,
  activeRevision: RevisionColor = 'white'
): Promise<ScriptBlock[]> {
  return invokeTauri<ScriptBlock[]>('parse_fdx_xml', {
    xml,
    activeRevision,
  });
}

export async function invokeRustFormatWhatsApp(
  blocks: ScriptBlock[]
): Promise<string> {
  return invokeTauri<string>('format_whatsapp_readable_text', { blocks });
}

export async function invokeRustFormatStyledHtml(
  blocks: ScriptBlock[]
): Promise<string> {
  return invokeTauri<string>('format_styled_html_clipboard', { blocks });
}

export async function invokeRustMoveSceneChunk(
  blocks: ScriptBlock[],
  sceneId: string,
  direction: 'up' | 'down',
  lockMode: boolean
): Promise<ScriptBlock[]> {
  return invokeTauri<ScriptBlock[]>('move_scene_chunk', {
    blocks,
    sceneId,
    direction,
    lockMode,
  });
}

export interface RustSnapshotDiffEntry {
  status: 'added' | 'removed' | 'modified';
  elementType: string;
  beforeText?: string;
  afterText?: string;
  sceneNumber?: string;
}

export interface RustSnapshotDiffResult {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  changedSceneNumbers: string[];
  entries: RustSnapshotDiffEntry[];
}

export async function invokeRustDiffSnapshots(
  baseBlocks: ScriptBlock[],
  currentBlocks: ScriptBlock[]
): Promise<RustSnapshotDiffResult> {
  return invokeTauri<RustSnapshotDiffResult>('diff_draft_snapshots', {
    baseBlocks,
    currentBlocks,
  });
}

export async function invokeRustExportChangedScenesFountain(
  titlePage: TitlePageData,
  baseBlocks: ScriptBlock[],
  currentBlocks: ScriptBlock[]
): Promise<string> {
  return invokeTauri<string>('export_changed_scenes_fountain', {
    title: titlePage.title,
    author: titlePage.writtenBy,
    baseBlocks,
    currentBlocks,
  });
}
