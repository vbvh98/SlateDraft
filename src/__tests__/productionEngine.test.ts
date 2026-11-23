import { describe, expect, it } from 'vitest';
import { ScriptBlock, ShootDay } from '../types/screenplay';
import {
  autoScheduleShootDays,
  buildDepartmentRollup,
  computeDayOutOfDays,
  detectElementsInScene,
  exportDoodCsv,
  extractSceneBreakdowns,
} from '../services/productionEngine';

const SAMPLE_BLOCKS: ScriptBlock[] = [
  {
    id: 's1',
    elementType: 'scene-heading',
    text: 'INT. CHURCHGATE STATION - NIGHT',
    sceneNumber: '1',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
    synopsis: 'Kabir sprints for the last Virar fast local.',
    productionTags: {
      props: ['Leather Satchel'],
      costumes: ['Wet Trenchcoat'],
      vfx: [],
      stunts: [],
      extras: ['Commuters'],
      vehicles: ['Local Train'],
      songs: [],
    },
  },
  {
    id: 'a1',
    elementType: 'action',
    text: 'Rain pours down as Kabir dodges a crowd of commuters and jumps onto the moving train with his phone.',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
  },
  {
    id: 'c1',
    elementType: 'character',
    text: 'KABIR',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
  },
  {
    id: 'd1',
    elementType: 'dialogue',
    text: 'Wait! Hold the door!',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
  },
  {
    id: 's2',
    elementType: 'scene-heading',
    text: 'EXT. MARINE DRIVE - DAY',
    sceneNumber: '2',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
    synopsis: 'Meera meets Kabir by the promenade.',
  },
  {
    id: 'c2',
    elementType: 'character',
    text: 'MEERA',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
  },
  {
    id: 'd2',
    elementType: 'dialogue',
    text: 'Did you bring the dossier?',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
  },
  {
    id: 's3',
    elementType: 'scene-heading',
    text: 'INT. CHURCHGATE STATION - NIGHT',
    sceneNumber: '3',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
    productionTags: {
      props: ['Leather Satchel'],
      costumes: [],
      vfx: [],
      stunts: [],
      extras: [],
      vehicles: [],
      songs: [],
    },
  },
  {
    id: 'c3',
    elementType: 'character',
    text: 'KABIR (V.O.)',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
  },
  {
    id: 'd3',
    elementType: 'dialogue',
    text: 'Some trains only come once.',
    locked: false,
    omitted: false,
    revisionColor: 'white',
    isDualDialogue: false,
  },
];

describe('Production Engine (Stripboard, DOOD, Auto-Detect, Dept Rollup)', () => {
  it('extracts per-scene breakdowns with correct strip colors and cast', () => {
    const scenes = extractSceneBreakdowns(SAMPLE_BLOCKS);
    expect(scenes).toHaveLength(3);

    expect(scenes[0].stripColor).toBe('int-night');
    expect(scenes[0].cast).toEqual(['KABIR']);
    expect(scenes[0].location).toBe('CHURCHGATE STATION');

    expect(scenes[1].stripColor).toBe('ext-day');
    expect(scenes[1].cast).toEqual(['MEERA']);

    expect(scenes[2].cast).toEqual(['KABIR']);
  });

  it('auto-schedules scenes by clustering Day vs Night and Location', () => {
    const scenes = extractSceneBreakdowns(SAMPLE_BLOCKS);
    const days = autoScheduleShootDays(scenes);

    // Day 1 = DAY scene (s2), Day 2 = NIGHT scenes (s1, s3 clustered together)
    expect(days).toHaveLength(2);
    expect(days[0].sceneIds).toEqual(['s2']);
    expect(days[1].sceneIds).toEqual(['s1', 's3']);
    expect(days[1].generalCall).toBe('18:00');
  });

  it('computes Day-Out-of-Days (DOOD) codes and detects Hold (H) days accurately', () => {
    const scenes = extractSceneBreakdowns(SAMPLE_BLOCKS);
    const manualDays: ShootDay[] = [
      {
        id: 'd1',
        dayNumber: 1,
        label: 'Day 1',
        shootDate: '',
        generalCall: '07:00',
        locationAddress: '',
        nearestHospital: '',
        sunriseSunset: '',
        weatherNotes: '',
        safetyNotes: '',
        sceneIds: ['s1'], // KABIR works
      },
      {
        id: 'd2',
        dayNumber: 2,
        label: 'Day 2',
        shootDate: '',
        generalCall: '07:00',
        locationAddress: '',
        nearestHospital: '',
        sunriseSunset: '',
        weatherNotes: '',
        safetyNotes: '',
        sceneIds: ['s2'], // MEERA works; KABIR is on HOLD
      },
      {
        id: 'd3',
        dayNumber: 3,
        label: 'Day 3',
        shootDate: '',
        generalCall: '18:00',
        locationAddress: '',
        nearestHospital: '',
        sunriseSunset: '',
        weatherNotes: '',
        safetyNotes: '',
        sceneIds: ['s3'], // KABIR works and finishes
      },
    ];

    const dood = computeDayOutOfDays(scenes, manualDays);
    const kabir = dood.rows.find((r) => r.characterName === 'KABIR');
    const meera = dood.rows.find((r) => r.characterName === 'MEERA');

    expect(kabir).toBeDefined();
    expect(kabir?.codesByDayId).toEqual({ d1: 'SW', d2: 'H', d3: 'WF' });
    expect(kabir?.workDays).toBe(2);
    expect(kabir?.holdDays).toBe(1);
    expect(kabir?.totalSpanDays).toBe(3);

    expect(meera?.codesByDayId).toEqual({ d1: '', d2: 'SWF', d3: '' });
    expect(meera?.holdDays).toBe(0);

    expect(dood.totalHoldDays).toBe(1);

    const csv = exportDoodCsv(dood, manualDays);
    expect(csv).toContain('"KABIR","2","1","3","SW","H","WF"');
  });

  it('auto-detects department cues from scene action text', () => {
    const detected = detectElementsInScene(
      'Rain pours down as Kabir dodges a crowd of commuters and jumps onto the moving train with his phone.'
    );
    expect(detected.props).toContain('Mobile Phone');
    expect(detected.vfx).toContain('Weather / Atmospheric FX');
    expect(detected.stunts).toContain('Chase / Fall Stunt');
    expect(detected.extras).toContain('Background Crowd (Junior Artists)');
    expect(detected.vehicles).toContain('Large Transit Vehicle');
  });

  it('builds department-specific HOD rollups with scene numbers and shoot days', () => {
    const scenes = extractSceneBreakdowns(SAMPLE_BLOCKS);
    const days = autoScheduleShootDays(scenes);
    const propsRollup = buildDepartmentRollup(scenes, days, 'props');

    expect(propsRollup).toHaveLength(1);
    expect(propsRollup[0].item).toBe('Leather Satchel');
    expect(propsRollup[0].occurrences).toBe(2);
    expect(propsRollup[0].sceneNumbers).toEqual(['1', '3']);
    expect(propsRollup[0].shootDayNumbers).toEqual([2]);
  });
});
