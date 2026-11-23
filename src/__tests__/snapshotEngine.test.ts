import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TITLE_PAGE } from '../data/templates';
import {
  createDraftSnapshot,
  diffDraftSnapshots,
  exportChangedScenesFountain,
} from '../services/snapshotEngine';
import { ScriptBlock } from '../types/screenplay';

function makeBlock(
  id: string,
  elementType: ScriptBlock['elementType'],
  text: string,
  extra: Partial<ScriptBlock> = {}
): ScriptBlock {
  return {
    id,
    elementType,
    text,
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
    ...extra,
  };
}

describe('Draft Snapshot & Revision Comparison Engine', () => {
  it('creates a deep-cloned snapshot isolated from subsequent mutations', () => {
    const sourceBlocks: ScriptBlock[] = [
      makeBlock('b1', 'scene-heading', 'INT. STUDIO - DAY', {
        sceneNumber: '1',
        productionTags: {
          props: ['Clapperboard'],
          costumes: [],
          vfx: [],
          stunts: [],
          extras: [],
          vehicles: [],
          songs: [],
        },
      }),
      makeBlock('b2', 'action', 'Camera rolls silently.'),
    ];

    const snap = createDraftSnapshot('  White Lock  ', 'white', sourceBlocks);

    expect(snap.id).toMatch(/^snap-/);
    expect(snap.name).toBe('White Lock');
    expect(snap.revisionColor).toBe('white');
    expect(Date.parse(snap.createdAt)).not.toBeNaN();
    expect(snap.blocks).toHaveLength(2);

    // Mutate originals after snapshot creation
    sourceBlocks[0].text = 'EXT. ROOFTOP - NIGHT';
    sourceBlocks[0].productionTags?.props.push('Rain Rig');
    sourceBlocks.push(makeBlock('b3', 'dialogue', 'New line'));

    expect(snap.blocks).toHaveLength(2);
    expect(snap.blocks[0].text).toBe('INT. STUDIO - DAY');
    expect(snap.blocks[0].productionTags?.props).toEqual(['Clapperboard']);
  });

  it('delegates snapshot diffing to Rust IPC and returns structured diff results', async () => {
    const invoke = vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
      expect(cmd).toBe('diff_draft_snapshots');
      const baseArg = args?.baseBlocks as ScriptBlock[];
      const currentArg = args?.currentBlocks as ScriptBlock[];
      if (baseArg.length === currentArg.length && baseArg[1].text === currentArg[1].text) {
        return {
          addedCount: 0,
          removedCount: 0,
          modifiedCount: 0,
          changedSceneNumbers: [],
          entries: [],
        };
      }
      return {
        addedCount: 2,
        removedCount: 1,
        modifiedCount: 1,
        changedSceneNumbers: ['1', '2A'],
        entries: [
          {
            status: 'modified',
            elementType: 'action',
            beforeText: 'Aarav checks his watch.',
            afterText: 'Aarav checks his watch and grabs the keys.',
            sceneNumber: '1',
          },
          {
            status: 'removed',
            elementType: 'dialogue',
            beforeText: 'We are late.',
            sceneNumber: '1',
          },
          { status: 'added', elementType: 'character', afterText: 'MEERA', sceneNumber: '2A' },
          { status: 'added', elementType: 'dialogue', afterText: 'Drive faster.', sceneNumber: '2A' },
        ],
      };
    });
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke } });

    const base: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. OFFICE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Aarav checks his watch.'),
      makeBlock('c1', 'character', 'AARAV'),
      makeBlock('d1', 'dialogue', 'We are late.'),
      makeBlock('s2', 'scene-heading', 'EXT. STREET - NIGHT', { sceneNumber: '2A' }),
      makeBlock('a2', 'action', 'Rain falls on the windshield.'),
    ];

    const identicalDiff = await diffDraftSnapshots(base, base.map((b) => ({ ...b })));
    expect(identicalDiff.addedCount).toBe(0);
    expect(identicalDiff.removedCount).toBe(0);
    expect(identicalDiff.modifiedCount).toBe(0);
    expect(identicalDiff.changedSceneNumbers).toEqual([]);
    expect(identicalDiff.entries).toEqual([]);

    const current: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. OFFICE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Aarav checks his watch and grabs the keys.'),
      makeBlock('c1', 'character', 'AARAV'),
      makeBlock('s2', 'scene-heading', 'EXT. STREET - NIGHT', { sceneNumber: '2A' }),
      makeBlock('a2', 'action', 'Rain falls on the windshield.'),
      makeBlock('c2', 'character', 'MEERA'),
      makeBlock('d2', 'dialogue', 'Drive faster.'),
    ];

    const diff = await diffDraftSnapshots(base, current);

    expect(diff.modifiedCount).toBe(1);
    expect(diff.removedCount).toBe(1);
    expect(diff.addedCount).toBe(2);
    expect(diff.changedSceneNumbers).toEqual(['1', '2A']);
    expect(invoke).toHaveBeenCalledWith('diff_draft_snapshots', {
      baseBlocks: base,
      currentBlocks: current,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delegates changed-scenes Fountain export to Rust IPC', async () => {
    const invoke = vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
      expect(cmd).toBe('export_changed_scenes_fountain');
      return `Title: ${String(args?.title)}\nEXT. STATION - NIGHT\nTrain screeches to a sudden halt.`;
    });
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke } });

    const base: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. CAFE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Untouched opening scene.'),
      makeBlock('s2', 'scene-heading', 'EXT. STATION - NIGHT', { sceneNumber: '2' }),
      makeBlock('a2', 'action', 'Train pulls in.'),
    ];

    const current: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. CAFE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Untouched opening scene.'),
      makeBlock('s2', 'scene-heading', 'EXT. STATION - NIGHT', { sceneNumber: '2' }),
      makeBlock('a2', 'action', 'Train screeches to a sudden halt.'),
    ];

    const fountain = await exportChangedScenesFountain(DEFAULT_TITLE_PAGE, base, current);

    expect(invoke).toHaveBeenCalledWith('export_changed_scenes_fountain', {
      title: DEFAULT_TITLE_PAGE.title,
      author: DEFAULT_TITLE_PAGE.writtenBy,
      baseBlocks: base,
      currentBlocks: current,
    });
    expect(fountain).toContain(`Title: ${DEFAULT_TITLE_PAGE.title}`);
    expect(fountain).toContain('EXT. STATION - NIGHT');
    expect(fountain).not.toContain('INT. CAFE - DAY');
  });
});
