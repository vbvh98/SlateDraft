import {
  IndicLanguage,
  ScriptAnalyticsReport,
  ScriptBlock,
  TitlePageData,
  TransliterationResult,
} from '../types/screenplay';
import { analyzeScriptSync, translateScriptLineSync } from './analyticsEngine';
import {
  exportToFdx,
  exportToFountain,
  parseSmartScriptText,
  recalculateSceneNumbers,
} from './formatInterchange';
import { transliterateWordSync } from './transliterationEngine';

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

export async function invokeRustTransliterate(
  word: string,
  language: IndicLanguage
): Promise<TransliterationResult> {
  if (isTauriDesktopRuntime() && window.__TAURI_INTERNALS__) {
    try {
      return await window.__TAURI_INTERNALS__.invoke<TransliterationResult>(
        'local_transliterate_word',
        { word, language }
      );
    } catch {
      // Fallback to local engine if IPC call fails
    }
  }
  return transliterateWordSync(word, language);
}

export async function invokeRustAnalytics(
  blocks: ScriptBlock[],
  language: IndicLanguage
): Promise<ScriptAnalyticsReport> {
  if (isTauriDesktopRuntime() && window.__TAURI_INTERNALS__) {
    try {
      return await window.__TAURI_INTERNALS__.invoke<ScriptAnalyticsReport>(
        'compute_script_analytics',
        { blocks, language }
      );
    } catch {
      // Fallback
    }
  }
  return analyzeScriptSync(blocks, language);
}

export async function invokeRustExportFountain(
  titlePage: TitlePageData,
  blocks: ScriptBlock[]
): Promise<string> {
  if (isTauriDesktopRuntime() && window.__TAURI_INTERNALS__) {
    try {
      return await window.__TAURI_INTERNALS__.invoke<string>('export_script_fountain', {
        title: titlePage.title,
        author: titlePage.writtenBy,
        blocks,
      });
    } catch {
      // Fallback
    }
  }
  return exportToFountain(titlePage, blocks);
}

export async function invokeRustExportFdx(
  titlePage: TitlePageData,
  blocks: ScriptBlock[]
): Promise<string> {
  if (isTauriDesktopRuntime() && window.__TAURI_INTERNALS__) {
    try {
      return await window.__TAURI_INTERNALS__.invoke<string>('export_script_fdx', {
        title: titlePage.title,
        blocks,
      });
    } catch {
      // Fallback
    }
  }
  return exportToFdx(titlePage, blocks);
}

export async function invokeRustParseScript(raw: string): Promise<ScriptBlock[]> {
  if (isTauriDesktopRuntime() && window.__TAURI_INTERNALS__) {
    try {
      return await window.__TAURI_INTERNALS__.invoke<ScriptBlock[]>('parse_script_text', { raw });
    } catch {
      // Fallback
    }
  }
  return parseSmartScriptText(raw);
}

export async function invokeRustSceneLocks(
  blocks: ScriptBlock[],
  lockMode: boolean
): Promise<ScriptBlock[]> {
  if (isTauriDesktopRuntime() && window.__TAURI_INTERNALS__) {
    try {
      return await window.__TAURI_INTERNALS__.invoke<ScriptBlock[]>('update_scene_locks', {
        blocks,
        lockMode,
      });
    } catch {
      // Fallback
    }
  }
  return recalculateSceneNumbers(blocks, lockMode);
}

export async function invokeRustTranslateLine(
  text: string,
  targetLanguage: IndicLanguage
): Promise<string> {
  if (isTauriDesktopRuntime() && window.__TAURI_INTERNALS__) {
    try {
      return await window.__TAURI_INTERNALS__.invoke<string>('translate_script_line', {
        text,
        targetLanguage,
      });
    } catch {
      // Fallback
    }
  }
  return translateScriptLineSync(text, targetLanguage);
}
