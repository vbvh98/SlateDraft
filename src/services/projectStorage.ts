import {
  AVRow,
  CharacterProfile,
  IndicLanguage,
  ProductionState,
  RevisionColor,
  ScriptBlock,
  StudioTheme,
  TitlePageData,
} from '../types/screenplay';
import {
  DEFAULT_TITLE_PAGE,
  INITIAL_BLANK_AV_ROWS,
  INITIAL_BLANK_CHARACTERS,
} from '../data/templates';
import { invokeTauri } from './rustBridge';
import { DraftSnapshot } from './snapshotEngine';
import { LANGUAGE_METADATA } from './transliterationEngine';

export const PROJECT_SCHEMA_VERSION = 1 as const;
export const PROJECT_FILE_EXTENSION = '.slatedraft';

const VALID_THEMES = new Set<StudioTheme>(['obsidian', 'sahitya', 'neel']);
const VALID_REVISION_COLORS = new Set<RevisionColor>([
  'white',
  'blue',
  'pink',
  'yellow',
  'green',
  'goldenrod',
  'buff',
  'salmon',
  'cherry',
]);

export interface SlateDraftProjectFile {
  schemaVersion: 1;
  savedAt: string;
  titlePage: TitlePageData;
  blocks: ScriptBlock[];
  avRows: AVRow[];
  characters: CharacterProfile[];
  productionState: ProductionState;
  language: IndicLanguage;
  revisionColor: RevisionColor;
  scenesLocked: boolean;
  theme: StudioTheme;
  activeTemplateId: string;
  snapshots?: DraftSnapshot[];
}

export type ProjectWorkspaceSnapshot = Omit<
  SlateDraftProjectFile,
  'schemaVersion' | 'savedAt'
> & {
  savedAt?: string;
};

export interface SaveProjectResult {
  savedPath: string;
  mode: 'desktop' | 'browser';
}

export function buildProjectSlug(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'untitled-screenplay';
}

export function serializeProjectFile(state: ProjectWorkspaceSnapshot): string {
  const payload: SlateDraftProjectFile = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    savedAt: state.savedAt ?? new Date().toISOString(),
    titlePage: { ...DEFAULT_TITLE_PAGE, ...state.titlePage },
    blocks: state.blocks,
    avRows: state.avRows,
    characters: state.characters,
    productionState: {
      shootDays: state.productionState?.shootDays ?? [],
      shots: state.productionState?.shots ?? [],
      castCalls: state.productionState?.castCalls ?? {},
      ...(Array.isArray(state.productionState?.crewContacts)
        ? { crewContacts: state.productionState.crewContacts }
        : {}),
    },
    language: state.language,
    revisionColor: state.revisionColor,
    scenesLocked: state.scenesLocked,
    theme: state.theme,
    activeTemplateId: state.activeTemplateId,
    snapshots: Array.isArray(state.snapshots) ? state.snapshots : [],
  };
  return JSON.stringify(payload, null, 2);
}

function isValidScriptBlock(candidate: unknown): candidate is ScriptBlock {
  if (!candidate || typeof candidate !== 'object') return false;
  const block = candidate as Record<string, unknown>;
  return (
    typeof block.id === 'string' &&
    block.id.length > 0 &&
    typeof block.elementType === 'string' &&
    typeof block.text === 'string'
  );
}

function isValidDraftSnapshot(candidate: unknown): candidate is DraftSnapshot {
  if (!candidate || typeof candidate !== 'object') return false;
  const snap = candidate as Record<string, unknown>;
  return (
    typeof snap.id === 'string' &&
    snap.id.length > 0 &&
    typeof snap.name === 'string' &&
    typeof snap.createdAt === 'string' &&
    typeof snap.revisionColor === 'string' &&
    VALID_REVISION_COLORS.has(snap.revisionColor as RevisionColor) &&
    Array.isArray(snap.blocks) &&
    snap.blocks.every(isValidScriptBlock)
  );
}

function hydrateProductionState(raw: unknown): ProductionState {
  if (!raw || typeof raw !== 'object') {
    return { shootDays: [], shots: [], castCalls: {} };
  }
  const obj = raw as Record<string, unknown>;
  return {
    shootDays: Array.isArray(obj.shootDays) ? obj.shootDays : [],
    shots: Array.isArray(obj.shots) ? obj.shots : [],
    castCalls:
      obj.castCalls && typeof obj.castCalls === 'object' && !Array.isArray(obj.castCalls)
        ? (obj.castCalls as ProductionState['castCalls'])
        : {},
    ...(Array.isArray(obj.crewContacts)
      ? { crewContacts: obj.crewContacts as ProductionState['crewContacts'] }
      : {}),
  };
}

export function parseProjectFile(raw: string): SlateDraftProjectFile | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;

  if (record.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    return null;
  }

  if (
    !Array.isArray(record.blocks) ||
    record.blocks.length === 0 ||
    !record.blocks.every(isValidScriptBlock)
  ) {
    return null;
  }

  const titlePageRaw =
    record.titlePage && typeof record.titlePage === 'object' && !Array.isArray(record.titlePage)
      ? (record.titlePage as Partial<TitlePageData>)
      : {};

  const avRows: AVRow[] = Array.isArray(record.avRows)
    ? (record.avRows as AVRow[])
    : INITIAL_BLANK_AV_ROWS;

  const characters: CharacterProfile[] = Array.isArray(record.characters)
    ? (record.characters as CharacterProfile[])
    : INITIAL_BLANK_CHARACTERS;

  const language: IndicLanguage =
    typeof record.language === 'string' && record.language in LANGUAGE_METADATA
      ? (record.language as IndicLanguage)
      : 'english';

  const revisionColor: RevisionColor =
    typeof record.revisionColor === 'string' &&
    VALID_REVISION_COLORS.has(record.revisionColor as RevisionColor)
      ? (record.revisionColor as RevisionColor)
      : 'white';

  const theme: StudioTheme =
    typeof record.theme === 'string' && VALID_THEMES.has(record.theme as StudioTheme)
      ? (record.theme as StudioTheme)
      : 'obsidian';

  const scenesLocked =
    typeof record.scenesLocked === 'boolean' ? record.scenesLocked : false;

  const activeTemplateId =
    typeof record.activeTemplateId === 'string' && record.activeTemplateId.trim()
      ? record.activeTemplateId
      : 'tpl-blank-feature';

  const savedAt =
    typeof record.savedAt === 'string' && record.savedAt.trim()
      ? record.savedAt
      : new Date().toISOString();

  const snapshots: DraftSnapshot[] = Array.isArray(record.snapshots)
    ? record.snapshots.filter(isValidDraftSnapshot)
    : [];

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    savedAt,
    titlePage: { ...DEFAULT_TITLE_PAGE, ...titlePageRaw },
    blocks: record.blocks as ScriptBlock[],
    avRows,
    characters,
    productionState: hydrateProductionState(record.productionState),
    language,
    revisionColor,
    scenesLocked,
    theme,
    activeTemplateId,
    snapshots,
  };
}

export async function getRecentProjects(): Promise<string[]> {
  return invokeTauri<string[]>('get_recent_projects');
}

export async function recordRecentProject(path: string): Promise<string[]> {
  const trimmed = path.trim();
  if (!trimmed) return getRecentProjects();
  return invokeTauri<string[]>('record_recent_project', {
    path: trimmed,
  });
}

export async function saveProjectFile(
  pathOrFilename: string,
  content: string
): Promise<SaveProjectResult> {
  const normalizedName = pathOrFilename.endsWith(PROJECT_FILE_EXTENSION)
    ? pathOrFilename
    : `${pathOrFilename}${PROJECT_FILE_EXTENSION}`;

  const canonical = await invokeTauri<string>('save_project_file', {
    path: normalizedName,
    content,
  });
  return { savedPath: canonical, mode: 'desktop' };
}

export async function loadProjectFile(path: string): Promise<string | null> {
  return invokeTauri<string>('load_project_file', {
    path,
  });
}

export async function writeBackupSnapshot(
  projectSlug: string,
  content: string
): Promise<string | null> {
  const slug = buildProjectSlug(projectSlug);
  return invokeTauri<string>('write_backup_snapshot', {
    projectSlug: slug,
    content,
  });
}

export async function invokeNativeNewWindow(): Promise<boolean> {
  await invokeTauri('open_new_window');
  return true;
}
