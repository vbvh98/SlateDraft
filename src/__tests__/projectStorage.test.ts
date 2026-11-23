import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AVRow,
  CharacterProfile,
  ProductionState,
  ScriptBlock,
  TitlePageData,
} from '../types/screenplay';
import {
  buildProjectSlug,
  getRecentProjects,
  invokeNativeNewWindow,
  loadProjectFile,
  parseProjectFile,
  PROJECT_SCHEMA_VERSION,
  recordRecentProject,
  saveProjectFile,
  serializeProjectFile,
  writeBackupSnapshot,
} from '../services/projectStorage';
import { DraftSnapshot } from '../services/snapshotEngine';

const SAMPLE_TITLE_PAGE: TitlePageData = {
  title: 'MONSOON EXPRESS',
  nativeTitle: 'मानसून एक्सप्रेस',
  logline: 'A night train conductor uncovers a conspiracy before dawn.',
  writtenBy: 'Aarav Kulkarni',
  storyBy: 'Aarav Kulkarni',
  dialoguesBy: 'Meera Nair',
  lyricsBy: 'Kabir Das',
  productionHouse: 'Deccan Films',
  swaRegistrationNumber: 'SWA-2026-9912',
  draftName: 'Shooting Draft',
  draftDate: '2026-11-23',
  contactInfo: 'aarav@deccanfilms.in',
  watermarkText: 'CONFIDENTIAL — CAST COPY',
  watermarkEnabled: true,
};

const SAMPLE_BLOCKS: ScriptBlock[] = [
  {
    id: 'blk-1',
    elementType: 'scene-heading',
    text: 'INT. DADAR PLATFORM 4 - NIGHT',
    sceneNumber: '1',
    locked: true,
    omitted: false,
    revisionColor: 'blue',
    isDualDialogue: false,
    synopsis: 'Rohan spots the courier boarding the last local.',
    rasa: 'bhayanaka',
    productionTags: {
      props: ['Brass Whistle', 'Sealed Envelope'],
      costumes: ['Raincoat'],
      vfx: ['Heavy Rain'],
      stunts: ['Train Leap'],
      extras: ['Commuters'],
      vehicles: ['Local Train'],
      songs: [],
    },
  },
  {
    id: 'blk-2',
    elementType: 'character',
    text: 'ROHAN',
    locked: false,
    omitted: false,
    revisionColor: 'blue',
    isDualDialogue: false,
  },
  {
    id: 'blk-3',
    elementType: 'dialogue',
    text: 'रुको! यह आखिरी ट्रेन है!',
    locked: false,
    omitted: false,
    revisionColor: 'blue',
    isDualDialogue: false,
  },
];

const SAMPLE_AV_ROWS: AVRow[] = [
  {
    id: 'av-1',
    cueNumber: '1',
    durationSeconds: 8,
    shotType: 'TRACKING',
    visualText: 'Camera tracks wet boots racing along the platform.',
    audioSpeaker: 'ROHAN',
    audioType: 'SYNC',
    audioText: 'Hold the compartment door!',
  },
];

const SAMPLE_CHARACTERS: CharacterProfile[] = [
  {
    id: 'char-1',
    name: 'ROHAN',
    nativeName: 'रोहन',
    roleArchetype: 'Protagonist',
    ageRange: '30-35',
    dialectNotes: 'Bambaiya Hindi',
    motivation: 'Protect the passenger manifest',
    arcSummary: 'From reluctant clerk to decisive hero',
    voicePitch: 0.9,
    voiceRate: 1.1,
  },
];

const SAMPLE_PRODUCTION_STATE: ProductionState = {
  shootDays: [
    {
      id: 'day-1',
      dayNumber: 1,
      label: 'Day 1 — Dadar Night Exterior',
      shootDate: '2026-12-01',
      generalCall: '18:00',
      locationAddress: 'Dadar Western Railway Yard, Mumbai',
      nearestHospital: 'KEM Hospital, Parel',
      sunriseSunset: '06:52 / 18:01',
      weatherNotes: 'Artificial rain towers',
      safetyNotes: 'Track clearance officer on set',
      sceneIds: ['blk-1'],
    },
  ],
  shots: [
    {
      id: 'shot-1',
      sceneId: 'blk-1',
      shotNumber: '1A',
      size: 'WIDE',
      movement: 'STEADICAM',
      lens: '24mm Anamorphic',
      description: 'Establishing platform in pouring rain',
      setupMinutes: 35,
      lightingNotes: 'Overhead sodium vapor practicals',
      completed: false,
    },
  ],
  castCalls: {
    ROHAN: {
      characterName: 'ROHAN',
      actorName: 'Vikrant Sen',
      callTime: '17:00',
      hmwTime: '17:30',
      onSetTime: '18:30',
    },
  },
};

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('projectStorage — .slatedraft serialization & parsing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('roundtrips a complete SlateDraft project file preserving all workspace data', () => {
    const raw = serializeProjectFile({
      savedAt: '2026-11-23T12:00:00.000Z',
      titlePage: SAMPLE_TITLE_PAGE,
      blocks: SAMPLE_BLOCKS,
      avRows: SAMPLE_AV_ROWS,
      characters: SAMPLE_CHARACTERS,
      productionState: SAMPLE_PRODUCTION_STATE,
      language: 'hindi',
      revisionColor: 'blue',
      scenesLocked: true,
      theme: 'neel',
      activeTemplateId: 'tpl-bollywood-feature',
    });

    const parsed = parseProjectFile(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(parsed?.savedAt).toBe('2026-11-23T12:00:00.000Z');
    expect(parsed?.titlePage).toEqual(SAMPLE_TITLE_PAGE);
    expect(parsed?.blocks).toEqual(SAMPLE_BLOCKS);
    expect(parsed?.blocks[0].productionTags?.props).toEqual([
      'Brass Whistle',
      'Sealed Envelope',
    ]);
    expect(parsed?.avRows).toEqual(SAMPLE_AV_ROWS);
    expect(parsed?.characters).toEqual(SAMPLE_CHARACTERS);
    expect(parsed?.productionState).toEqual(SAMPLE_PRODUCTION_STATE);
    expect(parsed?.language).toBe('hindi');
    expect(parsed?.revisionColor).toBe('blue');
    expect(parsed?.scenesLocked).toBe(true);
    expect(parsed?.theme).toBe('neel');
    expect(parsed?.activeTemplateId).toBe('tpl-bollywood-feature');
  });

  it('rejects malformed JSON, non-object payloads, and invalid schema versions', () => {
    expect(parseProjectFile('')).toBeNull();
    expect(parseProjectFile('{not valid json')).toBeNull();
    expect(parseProjectFile('null')).toBeNull();
    expect(parseProjectFile('[]')).toBeNull();
    expect(parseProjectFile('{}')).toBeNull();
    expect(
      parseProjectFile(
        JSON.stringify({
          schemaVersion: 2,
          blocks: SAMPLE_BLOCKS,
        })
      )
    ).toBeNull();
    expect(
      parseProjectFile(
        JSON.stringify({
          schemaVersion: 1,
          blocks: [],
        })
      )
    ).toBeNull();
    expect(
      parseProjectFile(
        JSON.stringify({
          schemaVersion: 1,
          blocks: [{ id: 123, elementType: 'action', text: 'bad' }],
        })
      )
    ).toBeNull();
  });

  it('hydrates partial-field project files with safe defaults', () => {
    const minimal = JSON.stringify({
      schemaVersion: 1,
      blocks: [
        {
          id: 'blk-only',
          elementType: 'scene-heading',
          text: 'EXT. ROOFTOP - DAWN',
          locked: false,
          omitted: false,
          revisionColor: 'white',
          isDualDialogue: false,
        },
      ],
      titlePage: {
        title: 'PARTIAL DRAFT',
      },
      language: 'unknown-lang',
      theme: 'invalid-theme',
      revisionColor: 'neon-purple',
    });

    const parsed = parseProjectFile(minimal);
    expect(parsed).not.toBeNull();
    expect(parsed?.titlePage.title).toBe('PARTIAL DRAFT');
    expect(parsed?.titlePage.watermarkEnabled).toBe(false);
    expect(parsed?.language).toBe('english');
    expect(parsed?.theme).toBe('obsidian');
    expect(parsed?.revisionColor).toBe('white');
    expect(parsed?.scenesLocked).toBe(false);
    expect(parsed?.productionState).toEqual({
      shootDays: [],
      shots: [],
      castCalls: {},
    });
    expect(Array.isArray(parsed?.avRows)).toBe(true);
    expect(Array.isArray(parsed?.characters)).toBe(true);
    expect(parsed?.activeTemplateId).toBe('tpl-blank-feature');
  });

  it('builds clean project slugs', () => {
    expect(buildProjectSlug('Monsoon Express (Draft 2)!')).toBe('monsoon-express-draft-2');
    expect(buildProjectSlug('   ')).toBe('untitled-screenplay');
  });

  it('routes save/load/backup/recent calls through Tauri IPC when available', async () => {
    const invoke = vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'save_project_file') return `/Users/writer/${String(args?.path)}`;
      if (cmd === 'load_project_file') return '{"schemaVersion":1}';
      if (cmd === 'write_backup_snapshot') return `/tmp/slatedraft-backups/${String(args?.projectSlug)}.slatedraft`;
      if (cmd === 'get_recent_projects') return ['/Users/writer/a.slatedraft'];
      if (cmd === 'record_recent_project') return [String(args?.path)];
      return null;
    });

    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: { invoke },
    });

    const saveRes = await saveProjectFile('monsoon', '{}');
    expect(saveRes).toEqual({
      savedPath: '/Users/writer/monsoon.slatedraft',
      mode: 'desktop',
    });
    expect(invoke).toHaveBeenCalledWith('save_project_file', {
      path: 'monsoon.slatedraft',
      content: '{}',
    });

    const loaded = await loadProjectFile('/Users/writer/monsoon.slatedraft');
    expect(loaded).toBe('{"schemaVersion":1}');

    const backup = await writeBackupSnapshot('Monsoon Express', '{}');
    expect(backup).toBe('/tmp/slatedraft-backups/monsoon-express.slatedraft');
    expect(invoke).toHaveBeenCalledWith('write_backup_snapshot', {
      projectSlug: 'monsoon-express',
      content: '{}',
    });

    expect(await getRecentProjects()).toEqual(['/Users/writer/a.slatedraft']);
    expect(await recordRecentProject('/Users/writer/b.slatedraft')).toEqual([
      '/Users/writer/b.slatedraft',
    ]);
  });

  it('roundtrips draft snapshots and filters invalid snapshot entries on parse', () => {
    const sampleSnapshots: DraftSnapshot[] = [
      {
        id: 'snap-white-1',
        name: 'White Lock',
        createdAt: '2026-11-23T10:00:00.000Z',
        revisionColor: 'white',
        blocks: SAMPLE_BLOCKS,
      },
      {
        id: 'snap-blue-2',
        name: 'Blue Shooting Draft',
        createdAt: '2026-11-23T11:30:00.000Z',
        revisionColor: 'blue',
        blocks: SAMPLE_BLOCKS.slice(0, 2),
      },
    ];

    const raw = serializeProjectFile({
      savedAt: '2026-11-23T12:00:00.000Z',
      titlePage: SAMPLE_TITLE_PAGE,
      blocks: SAMPLE_BLOCKS,
      avRows: SAMPLE_AV_ROWS,
      characters: SAMPLE_CHARACTERS,
      productionState: SAMPLE_PRODUCTION_STATE,
      language: 'hindi',
      revisionColor: 'blue',
      scenesLocked: true,
      theme: 'neel',
      activeTemplateId: 'tpl-bollywood-feature',
      snapshots: sampleSnapshots,
    });

    const parsed = parseProjectFile(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.snapshots).toEqual(sampleSnapshots);

    // Inject an invalid snapshot alongside a valid one and verify filtering
    const mutated = JSON.parse(raw);
    mutated.snapshots.push({ id: '', name: 'Broken', revisionColor: 'ultraviolet', blocks: 'bad' });
    const reparsed = parseProjectFile(JSON.stringify(mutated));
    expect(reparsed?.snapshots).toEqual(sampleSnapshots);
  });

  it('throws in non-Tauri environments and invokes open_new_window in Tauri runtime', async () => {
    vi.stubGlobal('window', {});
    await expect(invokeNativeNewWindow()).rejects.toThrow(
      /Tauri desktop runtime/i
    );
    await expect(saveProjectFile('monsoon', '{}')).rejects.toThrow(
      /Tauri desktop runtime/i
    );

    const failingInvoke = vi.fn(async () => {
      throw new Error('disk full');
    });
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: { invoke: failingInvoke },
    });
    await expect(getRecentProjects()).rejects.toThrow('disk full');

    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'open_new_window') return undefined;
      throw new Error('unexpected');
    });
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: { invoke },
    });
    expect(await invokeNativeNewWindow()).toBe(true);
    expect(invoke).toHaveBeenCalledWith('open_new_window', undefined);
  });
});
