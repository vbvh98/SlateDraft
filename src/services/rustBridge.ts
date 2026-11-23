import {
  IndicLanguage,
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
