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

  it('returns zero differences for identical drafts', () => {
    const base: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. OFFICE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Aarav checks his watch.'),
    ];

    const diff = diffDraftSnapshots(base, base.map((b) => ({ ...b })));
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.modifiedCount).toBe(0);
    expect(diff.changedSceneNumbers).toEqual([]);
    expect(diff.entries).toEqual([]);
  });

  it('detects added, modified, and removed blocks with accurate scene numbers', () => {
    const base: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. OFFICE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Aarav checks his watch.'),
      makeBlock('c1', 'character', 'AARAV'),
      makeBlock('d1', 'dialogue', 'We are late.'),
      makeBlock('s2', 'scene-heading', 'EXT. STREET - NIGHT', { sceneNumber: '2A' }),
      makeBlock('a2', 'action', 'Rain falls on the windshield.'),
    ];

    const current: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. OFFICE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Aarav checks his watch and grabs the keys.'), // modified
      makeBlock('c1', 'character', 'AARAV'),
      // d1 removed
      makeBlock('s2', 'scene-heading', 'EXT. STREET - NIGHT', { sceneNumber: '2A' }),
      makeBlock('a2', 'action', 'Rain falls on the windshield.'),
      makeBlock('c2', 'character', 'MEERA'), // added
      makeBlock('d2', 'dialogue', 'Drive faster.'), // added
    ];

    const diff = diffDraftSnapshots(base, current);

    expect(diff.modifiedCount).toBe(1);
    expect(diff.removedCount).toBe(1);
    expect(diff.addedCount).toBe(2);
    expect(diff.changedSceneNumbers).toEqual(['1', '2A']);

    const modified = diff.entries.find((e) => e.status === 'modified');
    expect(modified).toMatchObject({
      status: 'modified',
      elementType: 'action',
      beforeText: 'Aarav checks his watch.',
      afterText: 'Aarav checks his watch and grabs the keys.',
      sceneNumber: '1',
    });

    const removed = diff.entries.find((e) => e.status === 'removed');
    expect(removed).toMatchObject({
      status: 'removed',
      elementType: 'dialogue',
      beforeText: 'We are late.',
      sceneNumber: '1',
    });

    const added = diff.entries.filter((e) => e.status === 'added');
    expect(added).toHaveLength(2);
    expect(added[0].sceneNumber).toBe('2A');
    expect(added[1].afterText).toBe('Drive faster.');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports only changed scenes to Fountain via Rust IPC and omits untouched scenes', async () => {
    const invoke = vi.fn(async (_cmd: string, args?: Record<string, unknown>) => {
      const blocks = (args?.blocks as ScriptBlock[]) ?? [];
      return `Title: ${String(args?.title)}\n${blocks.map((b) => b.text).join('\n')}`;
    });
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke } });

    const base: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. CAFE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Untouched opening scene.'),
      makeBlock('s2', 'scene-heading', 'EXT. STATION - NIGHT', { sceneNumber: '2' }),
      makeBlock('a2', 'action', 'Train pulls in.'),
      makeBlock('s3', 'scene-heading', 'INT. TRAIN - NIGHT', { sceneNumber: '3' }),
      makeBlock('a3', 'action', 'Quiet compartment.'),
    ];

    const current: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. CAFE - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Untouched opening scene.'),
      makeBlock('s2', 'scene-heading', 'EXT. STATION - NIGHT', { sceneNumber: '2' }),
      makeBlock('a2', 'action', 'Train screeches to a sudden halt.'), // modified in Scene 2
      makeBlock('s3', 'scene-heading', 'INT. TRAIN - NIGHT', { sceneNumber: '3' }),
      makeBlock('a3', 'action', 'Quiet compartment.'),
    ];

    const fountain = await exportChangedScenesFountain(DEFAULT_TITLE_PAGE, base, current);

    expect(invoke).toHaveBeenCalledWith('export_script_fountain', {
      title: DEFAULT_TITLE_PAGE.title,
      author: DEFAULT_TITLE_PAGE.writtenBy,
      blocks: [current[2], current[3]],
    });
    expect(fountain).toContain(`Title: ${DEFAULT_TITLE_PAGE.title}`);
    expect(fountain).toContain('EXT. STATION - NIGHT');
    expect(fountain).toContain('Train screeches to a sudden halt.');
    expect(fountain).not.toContain('INT. CAFE - DAY');
  });

  it('includes a scene in changed-scenes Fountain export when a block is removed from it', async () => {
    const invoke = vi.fn(async (_cmd: string, args?: Record<string, unknown>) => {
      const blocks = (args?.blocks as ScriptBlock[]) ?? [];
      return blocks.map((b) => b.text).join('\n');
    });
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke } });

    const base: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. HALLWAY - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Footsteps echo.'),
      makeBlock('a2', 'action', 'A door slams shut.'),
    ];

    const current: ScriptBlock[] = [
      makeBlock('s1', 'scene-heading', 'INT. HALLWAY - DAY', { sceneNumber: '1' }),
      makeBlock('a1', 'action', 'Footsteps echo.'),
    ];

    const fountain = await exportChangedScenesFountain(DEFAULT_TITLE_PAGE, base, current);
    expect(invoke).toHaveBeenCalledWith('export_script_fountain', {
      title: DEFAULT_TITLE_PAGE.title,
      author: DEFAULT_TITLE_PAGE.writtenBy,
      blocks: current,
    });
    expect(fountain).toContain('INT. HALLWAY - DAY');
    expect(fountain).toContain('Footsteps echo.');
    expect(fountain).not.toContain('A door slams shut.');
  });
});
