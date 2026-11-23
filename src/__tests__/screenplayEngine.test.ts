import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_TITLE_PAGE,
  INDUSTRY_TEMPLATES,
  INITIAL_BLANK_BLOCKS,
} from '../data/templates';
import { formatPageEighths } from '../services/analyticsEngine';
import {
  extractFdxTitlePage,
  moveSceneChunk,
  parseFdxXml,
} from '../services/formatInterchange';
import {
  invokeRustAnalytics,
  invokeRustTransliterate,
} from '../services/rustBridge';
import { ScriptBlock } from '../types/screenplay';

describe('SlateDraft Desktop Engine & Bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with a clean blank screenplay canvas and no pre-written demo story', () => {
    expect(INITIAL_BLANK_BLOCKS).toHaveLength(1);
    expect(INITIAL_BLANK_BLOCKS[0].elementType).toBe('scene-heading');
    expect(INITIAL_BLANK_BLOCKS[0].text).toBe('INT. ');
    expect(DEFAULT_TITLE_PAGE.title).toBe('UNTITLED SCREENPLAY');
  });

  it('includes a complete library of professional industry starter templates', () => {
    expect(INDUSTRY_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    const ids = INDUSTRY_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('tpl-blank-feature');
    expect(ids).toContain('tpl-indian-theatrical-interval');
    expect(ids).toContain('tpl-ott-drama-1hr');
    expect(ids).toContain('tpl-wga-three-act');
    expect(ids).toContain('tpl-av-tvc-commercial');
  });

  it('formats 1/8th page counts for UI display', () => {
    expect(formatPageEighths(8)).toBe('1 pgs');
    expect(formatPageEighths(11)).toBe('1 3/8 pgs');
  });

  it('requires Tauri runtime and propagates Rust IPC errors without silent fallback', async () => {
    vi.stubGlobal('window', {});
    await expect(invokeRustTransliterate('namaste', 'hindi')).rejects.toThrow(
      /Tauri desktop runtime/i
    );

    const failingInvoke = vi.fn(async () => {
      throw new Error('rust command failed');
    });
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke: failingInvoke } });
    await expect(invokeRustAnalytics([], 'hindi')).rejects.toThrow(
      'rust command failed'
    );
  });

  it('extracts title page metadata and parses Final Draft (.fdx) XML', () => {
    const fdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Version="5">
  <TitlePage>
    <Content>
      <Paragraph Type="Title"><Text>MONSOON &amp; SHADOWS</Text></Paragraph>
      <Paragraph Type="Author"><Text>Meera Nair</Text></Paragraph>
    </Content>
  </TitlePage>
  <Content>
    <Paragraph Type="Scene Heading" Number="4">
      <Text>EXT. </Text><Text>STATION - DAWN</Text>
    </Paragraph>
    <DualDialogue>
      <Paragraph Type="Character"><Text>KAVYA</Text></Paragraph>
      <Paragraph Type="Dialogue"><Text>Wait!</Text></Paragraph>
    </DualDialogue>
  </Content>
</FinalDraft>`;

    const extractedMeta = extractFdxTitlePage(fdxXml);
    expect(extractedMeta.title).toBe('MONSOON & SHADOWS');
    expect(extractedMeta.writtenBy).toBe('Meera Nair');

    const parsed = parseFdxXml(fdxXml, 'yellow');
    expect(parsed).toHaveLength(3);
    expect(parsed[0].elementType).toBe('scene-heading');
    expect(parsed[0].text).toBe('EXT. STATION - DAWN');
    expect(parsed[0].sceneNumber).toBe('4');
    expect(parsed[0].revisionColor).toBe('yellow');
    expect(parsed[1].elementType).toBe('character');
    expect(parsed[1].isDualDialogue).toBe(true);
    expect(parsed[2].elementType).toBe('dialogue');
    expect(parsed[2].isDualDialogue).toBe(true);
  });

  it('moves full scene chunks up and down while preserving act markers and delegating scene numbering to Rust', async () => {
    const invoke = vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd !== 'update_scene_locks') throw new Error(`unexpected ${cmd}`);
      const list = args?.blocks as ScriptBlock[];
      let num = 1;
      return list.map((b) =>
        b.elementType === 'scene-heading' ? { ...b, sceneNumber: String(num++) } : b
      );
    });
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke } });

    const makeBlock = (
      id: string,
      elementType: ScriptBlock['elementType'],
      text: string,
      sceneNumber?: string
    ): ScriptBlock => ({
      id,
      elementType,
      text,
      sceneNumber,
      locked: false,
      omitted: false,
      revisionColor: 'white',
      isDualDialogue: false,
    });

    const blocks: ScriptBlock[] = [
      makeBlock('act1', 'section-act', 'ACT I'),
      makeBlock('s1', 'scene-heading', 'INT. CAFE - DAY', '1'),
      makeBlock('s1-a', 'action', 'Coffee steams.'),
      makeBlock('s1-d', 'dialogue', 'Morning.'),
      makeBlock('s2', 'scene-heading', 'EXT. STREET - DAY', '2'),
      makeBlock('s2-a', 'action', 'Traffic roars.'),
      makeBlock('act2', 'section-act', 'INTERVAL'),
      makeBlock('s3', 'scene-heading', 'INT. ROOFTOP - NIGHT', '3'),
      makeBlock('s3-a', 'action', 'Stars appear.'),
    ];

    expect(await moveSceneChunk(blocks, 's1', 'up', false)).toBe(blocks);
    expect(await moveSceneChunk(blocks, 's3', 'down', false)).toBe(blocks);

    const movedDown = await moveSceneChunk(blocks, 's1', 'down', false);
    expect(movedDown.map((b) => b.id)).toEqual([
      'act1',
      's2',
      's2-a',
      's1',
      's1-a',
      's1-d',
      'act2',
      's3',
      's3-a',
    ]);
    expect(movedDown.find((b) => b.id === 's2')?.sceneNumber).toBe('1');
    expect(movedDown.find((b) => b.id === 's1')?.sceneNumber).toBe('2');
    expect(movedDown.find((b) => b.id === 's3')?.sceneNumber).toBe('3');

    const movedBackUp = await moveSceneChunk(movedDown, 's1', 'up', false);
    expect(movedBackUp.map((b) => b.id)).toEqual(blocks.map((b) => b.id));
    expect(movedBackUp.find((b) => b.id === 's1')?.sceneNumber).toBe('1');
    expect(movedBackUp.find((b) => b.id === 's2')?.sceneNumber).toBe('2');
  });
});
