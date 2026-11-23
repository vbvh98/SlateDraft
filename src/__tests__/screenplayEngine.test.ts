import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TITLE_PAGE,
  INDUSTRY_TEMPLATES,
  INITIAL_BLANK_BLOCKS,
} from '../data/templates';
import { analyzeScriptSync, formatPageEighths } from '../services/analyticsEngine';
import {
  exportToFdx,
  exportToFountain,
  extractFdxTitlePage,
  moveSceneChunk,
  parseFdxXml,
  parseSmartScriptText,
  recalculateSceneNumbers,
} from '../services/formatInterchange';
import { ScriptBlock } from '../types/screenplay';
import {
  levenshteinDistance,
  transliterateWordSync,
} from '../services/transliterationEngine';

describe('SlateDraft Core Screenplay & Indic Engine', () => {
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

  it('transliterates Romanized words into Hindi, Tamil, Telugu, Kannada, and Malayalam', () => {
    const hi = transliterateWordSync('namaste', 'hindi');
    expect(hi.primary).toBe('नमस्ते');

    const ta = transliterateWordSync('vanakkam', 'tamil');
    expect(ta.primary).toBe('வணக்கம்');

    const te = transliterateWordSync('namaskaram', 'telugu');
    expect(te.primary).toBe('నమస్కారం');

    const kn = transliterateWordSync('namaskara', 'kannada');
    expect(kn.primary).toBe('ನಮಸ್ಕಾರ');

    const ml = transliterateWordSync('namaskaram', 'malayalam');
    expect(ml.primary).toBe('നമസ്കാരം');
  });

  it('computes Levenshtein edit distance accurately for fuzzy suggestions', () => {
    expect(levenshteinDistance('kaise', 'kaise')).toBe(0);
    expect(levenshteinDistance('namaste', 'namste')).toBe(1);
  });

  it('exports valid Fountain and Final Draft (.fdx) XML and round-trips via Smart Paste', () => {
    const blocks = parseSmartScriptText(
      `INT. SOUNDSTAGE - DAY\n\nCamera tracks forward.\n\nDIRECTOR\n(quietly)\nAction.`
    );
    expect(blocks.length).toBe(5);
    expect(blocks[0].elementType).toBe('scene-heading');
    expect(blocks[2].elementType).toBe('character');
    expect(blocks[3].elementType).toBe('parenthetical');
    expect(blocks[4].elementType).toBe('dialogue');

    const fountain = exportToFountain(DEFAULT_TITLE_PAGE, blocks);
    expect(fountain).toContain('INT. SOUNDSTAGE - DAY #1#');
    expect(fountain).toContain('DIRECTOR');

    const fdx = exportToFdx(DEFAULT_TITLE_PAGE, blocks);
    expect(fdx).toContain('<FinalDraft DocumentType="Script"');
    expect(fdx).toContain('Paragraph Type="Scene Heading" Number="1"');
  });

  it('locks scene numbers and generates A/B sub-indices for newly inserted scenes', () => {
    const lockedBlocks = recalculateSceneNumbers(
      [
        {
          id: '1',
          elementType: 'scene-heading',
          text: 'INT. ROOM - DAY',
          sceneNumber: '12',
          locked: true,
          omitted: false,
          revisionColor: 'white',
          isDualDialogue: false,
        },
        {
          id: '2',
          elementType: 'scene-heading',
          text: 'EXT. CORRIDOR - DAY',
          locked: false,
          omitted: false,
          revisionColor: 'blue',
          isDualDialogue: false,
        },
      ],
      true
    );

    expect(lockedBlocks[0].sceneNumber).toBe('12');
    expect(lockedBlocks[1].sceneNumber).toBe('12A');
  });

  it('computes empirical Indic page-timing and 1/8th page counts', () => {
    expect(formatPageEighths(8)).toBe('1 pgs');
    expect(formatPageEighths(11)).toBe('1 3/8 pgs');

    const blocks = parseSmartScriptText(
      `INT. OFFICE - NIGHT\n\nA desk lamp flickers.\n\nWRITER\nLet us finish Act Two.`
    );
    const report = analyzeScriptSync(blocks, 'hindi');
    expect(report.totalScenes).toBe(1);
    expect(report.indicCalibrationFactor).toBe(0.88);
    expect(report.characters[0].name).toBe('WRITER');
  });

  it('round-trips Final Draft (.fdx) XML via exportToFdx, parseFdxXml, and extractFdxTitlePage', () => {
    const titlePage = {
      ...DEFAULT_TITLE_PAGE,
      title: 'MONSOON & SHADOWS',
      writtenBy: 'Meera Nair',
    };
    const originalBlocks: ScriptBlock[] = [
      {
        id: 'b1',
        elementType: 'section-act',
        text: 'ACT ONE',
        locked: false,
        omitted: false,
        revisionColor: 'white',
        isDualDialogue: false,
        actMarker: 'ACT ONE',
      },
      {
        id: 'b2',
        elementType: 'scene-heading',
        text: 'INT. SOUNDSTAGE "A" - NIGHT',
        sceneNumber: '1',
        locked: false,
        omitted: false,
        revisionColor: 'white',
        isDualDialogue: false,
      },
      {
        id: 'b3',
        elementType: 'action',
        text: 'Rain hits glass & steel.',
        locked: false,
        omitted: false,
        revisionColor: 'blue',
        isDualDialogue: false,
      },
      {
        id: 'b4',
        elementType: 'character',
        text: 'AARAV',
        locked: false,
        omitted: false,
        revisionColor: 'white',
        isDualDialogue: true,
      },
      {
        id: 'b5',
        elementType: 'parenthetical',
        text: '(whispering)',
        locked: false,
        omitted: false,
        revisionColor: 'white',
        isDualDialogue: false,
      },
      {
        id: 'b6',
        elementType: 'dialogue',
        text: 'Roll sound <now>.',
        locked: false,
        omitted: false,
        revisionColor: 'pink',
        isDualDialogue: false,
      },
      {
        id: 'b7',
        elementType: 'song-lyric',
        text: 'Barse badal dheere se',
        locked: false,
        omitted: false,
        revisionColor: 'white',
        isDualDialogue: false,
      },
      {
        id: 'b8',
        elementType: 'transition',
        text: 'CUT TO:',
        locked: false,
        omitted: false,
        revisionColor: 'white',
        isDualDialogue: false,
      },
    ];

    const fdxXml = exportToFdx(titlePage, originalBlocks);
    const extractedMeta = extractFdxTitlePage(fdxXml);
    expect(extractedMeta.title).toBe('MONSOON & SHADOWS');
    expect(extractedMeta.writtenBy).toBe('Meera Nair');

    const parsed = parseFdxXml(fdxXml);
    expect(parsed).toHaveLength(originalBlocks.length);
    expect(parsed.map((b) => b.elementType)).toEqual(originalBlocks.map((b) => b.elementType));
    expect(parsed.map((b) => b.text)).toEqual(originalBlocks.map((b) => b.text));
    expect(parsed[1].sceneNumber).toBe('1');
    expect(parsed[2].revisionColor).toBe('blue');
    expect(parsed[3].isDualDialogue).toBe(true);
    expect(parsed[5].revisionColor).toBe('pink');
  });

  it('parses multi-<Text> spans and <DualDialogue> wrapper tags in external .fdx files', () => {
    const externalFdx = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Version="5">
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

    const parsed = parseFdxXml(externalFdx, 'yellow');
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

  it('moves full scene chunks up and down while preserving act markers and recalculating scene numbers', () => {
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

    // Moving first scene up is a no-op
    expect(moveSceneChunk(blocks, 's1', 'up', false)).toBe(blocks);
    // Moving last scene down is a no-op
    expect(moveSceneChunk(blocks, 's3', 'down', false)).toBe(blocks);

    // Move Scene 1 down past Scene 2 (full chunk s1 + s1-a + s1-d moves together)
    const movedDown = moveSceneChunk(blocks, 's1', 'down', false);
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

    // Move Scene 1 back up to restore original order
    const movedBackUp = moveSceneChunk(movedDown, 's1', 'up', false);
    expect(movedBackUp.map((b) => b.id)).toEqual(blocks.map((b) => b.id));
    expect(movedBackUp.find((b) => b.id === 's1')?.sceneNumber).toBe('1');
    expect(movedBackUp.find((b) => b.id === 's2')?.sceneNumber).toBe('2');
  });
});
