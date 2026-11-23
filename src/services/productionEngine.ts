import {
  CastCallEntry,
  ProductionTags,
  ScriptBlock,
  ShootDay,
  ShotItem,
  TitlePageData,
} from '../types/screenplay';
import { formatPageEighths } from './analyticsEngine';

export type StripColorKey = 'int-day' | 'int-night' | 'ext-day' | 'ext-night';
export type DoodCode = '' | 'SW' | 'W' | 'H' | 'WF' | 'SWF';

export interface SceneBreakdown {
  sceneId: string;
  sceneNumber: string;
  heading: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT' | 'OTHER';
  timeOfDay: 'DAY' | 'NIGHT';
  stripColor: StripColorKey;
  location: string;
  synopsis: string;
  eighths: number;
  estimatedHours: number;
  cast: string[];
  productionTags: ProductionTags;
  rawBodyText: string;
  omitted: boolean;
  locked: boolean;
}

export interface DoodCharacterRow {
  characterName: string;
  codesByDayId: Record<string, DoodCode>;
  workDays: number;
  holdDays: number;
  totalSpanDays: number;
  sceneCount: number;
}

export interface DoodReport {
  rows: DoodCharacterRow[];
  totalHoldDays: number;
  totalWorkDays: number;
}

export interface DepartmentRollupItem {
  item: string;
  sceneNumbers: string[];
  shootDayNumbers: number[];
  occurrences: number;
}

export const EMPTY_PRODUCTION_TAGS: ProductionTags = {
  props: [],
  costumes: [],
  vfx: [],
  stunts: [],
  extras: [],
  vehicles: [],
  songs: [],
};

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Extracts structured per-scene production data from the live screenplay blocks.
 */
export function extractSceneBreakdowns(blocks: ScriptBlock[]): SceneBreakdown[] {
  const scenes: SceneBreakdown[] = [];
  let current: {
    block: ScriptBlock;
    lines: number;
    castSet: Set<string>;
    bodyParts: string[];
  } | null = null;

  const flush = () => {
    if (!current) return;
    const { block, lines, castSet, bodyParts } = current;
    const upper = block.text.trim().toUpperCase();

    const intExt: SceneBreakdown['intExt'] =
      upper.startsWith('INT./EXT.') || upper.startsWith('I/E')
        ? 'INT/EXT'
        : upper.startsWith('INT.')
          ? 'INT'
          : upper.startsWith('EXT.')
            ? 'EXT'
            : 'OTHER';

    const isNight =
      upper.includes('NIGHT') ||
      upper.includes('DUSK') ||
      upper.includes('EVENING') ||
      upper.includes('MIDNIGHT') ||
      upper.includes('रात');

    const timeOfDay: SceneBreakdown['timeOfDay'] = isNight ? 'NIGHT' : 'DAY';

    const stripColor: StripColorKey =
      intExt === 'EXT'
        ? isNight
          ? 'ext-night'
          : 'ext-day'
        : isNight
          ? 'int-night'
          : 'int-day';

    const locationClean = upper
      .replace(/^(INT\.\/EXT\.|INT\.|EXT\.|I\/E)\s*/, '')
      .split('-')[0]
      .trim();

    // 54 lines per page -> ~6.75 lines per 1/8th page
    const eighths = Math.max(1, Math.round((lines / 54) * 8));
    // Industry rule of thumb: ~0.25–0.35 hrs per 1/8th page + base setup overhead
    const baseHours = eighths * 0.28 + (isNight ? 0.35 : 0.2);
    const estimatedHours = Number(Math.max(0.5, baseHours).toFixed(1));

    const tags = block.productionTags
      ? { ...EMPTY_PRODUCTION_TAGS, ...block.productionTags }
      : { ...EMPTY_PRODUCTION_TAGS };

    scenes.push({
      sceneId: block.id,
      sceneNumber: block.sceneNumber ?? String(scenes.length + 1),
      heading: block.text.trim() || 'UNTITLED SCENE',
      intExt,
      timeOfDay,
      stripColor,
      location: locationClean || 'UNSPECIFIED LOCATION',
      synopsis: block.synopsis ?? '',
      eighths,
      estimatedHours,
      cast: Array.from(castSet).sort(),
      productionTags: tags,
      rawBodyText: bodyParts.join('\n'),
      omitted: block.omitted,
      locked: block.locked,
    });
  };

  for (const block of blocks) {
    if (block.elementType === 'scene-heading') {
      flush();
      current = {
        block,
        lines: 2,
        castSet: new Set<string>(),
        bodyParts: [],
      };
      continue;
    }

    if (!current || block.omitted) continue;

    const words = block.text.trim() ? block.text.trim().split(/\s+/).length : 0;
    switch (block.elementType) {
      case 'action':
      case 'shot':
        current.lines += Math.max(1, Math.ceil(words / 10)) + 1;
        if (block.text.trim()) current.bodyParts.push(block.text.trim());
        break;
      case 'character': {
        current.lines += 1;
        const cleanName = block.text.split('(')[0].trim().toUpperCase();
        if (cleanName) current.castSet.add(cleanName);
        break;
      }
      case 'parenthetical':
        current.lines += 1;
        break;
      case 'dialogue':
        current.lines += Math.max(1, Math.ceil(words / 7)) + 1;
        if (block.text.trim()) current.bodyParts.push(block.text.trim());
        break;
      case 'song-lyric':
        current.lines += Math.max(2, block.text.split('\n').length) + 1;
        if (block.text.trim()) current.bodyParts.push(block.text.trim());
        break;
      case 'note':
        break;
      default:
        current.lines += 2;
        break;
    }
  }

  flush();
  return scenes;
}

/**
 * 1st AD Auto-Scheduler: clusters active scenes by Location + Day/Night to minimize
 * company moves and turnaround penalties, packing up to `maxEighthsPerDay` (default 36 = 4.5 pgs).
 */
export function autoScheduleShootDays(
  scenes: SceneBreakdown[],
  maxEighthsPerDay = 36
): ShootDay[] {
  const activeScenes = scenes.filter((s) => !s.omitted);
  if (activeScenes.length === 0) return [];

  // Sort by Day vs Night first (keep night shoots clustered), then Location, then Int/Ext
  const sorted = [...activeScenes].sort((a, b) => {
    if (a.timeOfDay !== b.timeOfDay) return a.timeOfDay === 'DAY' ? -1 : 1;
    const locCmp = a.location.localeCompare(b.location);
    if (locCmp !== 0) return locCmp;
    return a.intExt.localeCompare(b.intExt);
  });

  const days: ShootDay[] = [];
  let bucket: SceneBreakdown[] = [];
  let bucketEighths = 0;

  const commitDay = () => {
    if (bucket.length === 0) return;
    const dayNumber = days.length + 1;
    const isNightDay = bucket.every((s) => s.timeOfDay === 'NIGHT');
    const primaryLocation = bucket[0].location;
    days.push({
      id: `day-${dayNumber}`,
      dayNumber,
      label: `Day ${dayNumber} — ${primaryLocation}`,
      shootDate: '',
      generalCall: isNightDay ? '18:00' : '07:00',
      locationAddress: primaryLocation,
      nearestHospital: '',
      sunriseSunset: isNightDay ? 'Sunset 18:20 / Sunrise 06:15' : 'Sunrise 06:15 / Sunset 18:20',
      weatherNotes: '',
      safetyNotes: '',
      sceneIds: bucket.map((s) => s.sceneId),
    });
    bucket = [];
    bucketEighths = 0;
  };

  for (const scene of sorted) {
    const switchingTimeOfDay =
      bucket.length > 0 && bucket[0].timeOfDay !== scene.timeOfDay;
    const wouldExceedPageCap =
      bucket.length > 0 && bucketEighths + scene.eighths > maxEighthsPerDay;

    if (switchingTimeOfDay || wouldExceedPageCap) {
      commitDay();
    }
    bucket.push(scene);
    bucketEighths += scene.eighths;
  }
  commitDay();

  return days;
}

/**
 * Computes the industry-standard Day-Out-of-Days (DOOD) matrix for Producers & Line Producers.
 * Codes: SW (Start/Work), W (Work), H (Hold — paid idle day), WF (Work/Finish), SWF (Start/Work/Finish).
 */
export function computeDayOutOfDays(
  scenes: SceneBreakdown[],
  shootDays: ShootDay[]
): DoodReport {
  const sceneMap = new Map<string, SceneBreakdown>();
  for (const s of scenes) {
    sceneMap.set(s.sceneId, s);
  }

  const allCast = new Set<string>();
  const castSceneCount = new Map<string, number>();
  for (const s of scenes) {
    if (s.omitted) continue;
    for (const c of s.cast) {
      allCast.add(c);
      castSceneCount.set(c, (castSceneCount.get(c) ?? 0) + 1);
    }
  }

  const orderedDays = [...shootDays].sort((a, b) => a.dayNumber - b.dayNumber);
  const rows: DoodCharacterRow[] = [];
  let totalHoldDays = 0;
  let totalWorkDays = 0;

  for (const characterName of Array.from(allCast).sort()) {
    const workingIndices: number[] = [];
    orderedDays.forEach((day, idx) => {
      const worksToday = day.sceneIds.some((sid) => {
        const sc = sceneMap.get(sid);
        return sc ? sc.cast.includes(characterName) : false;
      });
      if (worksToday) workingIndices.push(idx);
    });

    const codesByDayId: Record<string, DoodCode> = {};
    let holdDays = 0;
    const firstIdx = workingIndices[0] ?? -1;
    const lastIdx = workingIndices[workingIndices.length - 1] ?? -1;

    orderedDays.forEach((day, idx) => {
      if (firstIdx === -1) {
        codesByDayId[day.id] = '';
        return;
      }
      const isWorking = workingIndices.includes(idx);
      if (isWorking) {
        if (idx === firstIdx && idx === lastIdx) {
          codesByDayId[day.id] = 'SWF';
        } else if (idx === firstIdx) {
          codesByDayId[day.id] = 'SW';
        } else if (idx === lastIdx) {
          codesByDayId[day.id] = 'WF';
        } else {
          codesByDayId[day.id] = 'W';
        }
      } else if (idx > firstIdx && idx < lastIdx) {
        codesByDayId[day.id] = 'H';
        holdDays += 1;
      } else {
        codesByDayId[day.id] = '';
      }
    });

    const workDays = workingIndices.length;
    const totalSpanDays = firstIdx === -1 ? 0 : lastIdx - firstIdx + 1;
    totalHoldDays += holdDays;
    totalWorkDays += workDays;

    rows.push({
      characterName,
      codesByDayId,
      workDays,
      holdDays,
      totalSpanDays,
      sceneCount: castSceneCount.get(characterName) ?? 0,
    });
  }

  rows.sort((a, b) => b.workDays - a.workDays || b.sceneCount - a.sceneCount);

  return {
    rows,
    totalHoldDays,
    totalWorkDays,
  };
}

const ELEMENT_DETECTION_PATTERNS: Record<keyof ProductionTags, Array<{ regex: RegExp; label: string }>> = {
  props: [
    { regex: /\b(phone|smartphone|mobile|cellphone)\b/i, label: 'Mobile Phone' },
    { regex: /\b(gun|pistol|revolver|rifle|weapon)\b/i, label: 'Hero Weapon / Prop Gun' },
    { regex: /\b(knife|dagger|blade)\b/i, label: 'Prop Knife' },
    { regex: /\b(letter|envelope|diary|notebook|file|folder|dossier)\b/i, label: 'Documents / Paper Prop' },
    { regex: /\b(tea|chai|coffee|cup|glass|bottle|whiskey|wine)\b/i, label: 'Drink / Glassware' },
    { regex: /\b(bag|suitcase|briefcase|backpack)\b/i, label: 'Luggage / Bag' },
    { regex: /\b(watch|ring|necklace|keys|wallet|cash|money)\b/i, label: 'Personal Prop' },
    { regex: /\b(laptop|computer|camera|radio|microphone)\b/i, label: 'Electronics Prop' },
  ],
  costumes: [
    { regex: /\b(uniform|police|khaki|doctor coat|suit|tuxedo)\b/i, label: 'Uniform / Formal Wardrobe' },
    { regex: /\b(saree|sari|lehenga|kurta|sherwani|dupatta)\b/i, label: 'Traditional / Ethnic Wardrobe' },
    { regex: /\b(blood|bloody|torn|soaked|wet|muddy|raincoat)\b/i, label: 'Distressed / Wet Wardrobe (Multiples)' },
    { regex: /\b(wedding|bridal|costume|mask|helmet)\b/i, label: 'Specialty Costume' },
  ],
  vfx: [
    { regex: /\b(explosion|blast|fireball|smoke|flames)\b/i, label: 'Pyro / VFX Simulation' },
    { regex: /\b(screen|monitor|hologram|hud|text message|notification)\b/i, label: 'Screen Replacement / Comp' },
    { regex: /\b(rain|storm|lightning|snow|fog|mist)\b/i, label: 'Weather / Atmospheric FX' },
    { regex: /\b(green screen|cgi|invisible|morph|glow|portal)\b/i, label: 'CGI / Compositing' },
  ],
  stunts: [
    { regex: /\b(fight|punch|kick|slap|brawl|combat|clash)\b/i, label: 'Fight Choreography' },
    { regex: /\b(chase|sprints|jumps|leaps|falls|crashes|tackle)\b/i, label: 'Chase / Fall Stunt' },
    { regex: /\b(gunshot|shootout|shoots|firing|bullet)\b/i, label: 'Firearms / Squib Safety' },
    { regex: /\b(crash|collision|skids|flips|swerves)\b/i, label: 'Precision Driving Stunt' },
  ],
  extras: [
    { regex: /\b(crowd|mob|audience|passengers|commuters|shoppers)\b/i, label: 'Background Crowd (Junior Artists)' },
    { regex: /\b(waiter|guard|constable|nurse|bartender|vendor|driver)\b/i, label: 'Featured Background / Day Players' },
    { regex: /\b(wedding guests|dancers|students|soldiers|reporters)\b/i, label: 'Specialty Extras' },
  ],
  vehicles: [
    { regex: /\b(car|sedan|suv|jeep|taxi|cab|auto-rickshaw|rickshaw)\b/i, label: 'Picture Vehicle (Car / Cab)' },
    { regex: /\b(train|local train|metro|bus|truck|van|ambulance)\b/i, label: 'Large Transit Vehicle' },
    { regex: /\b(bike|motorcycle|scooter|bullet|bicycle)\b/i, label: 'Two-Wheeler Picture Vehicle' },
    { regex: /\b(dog|horse|bird|cat|animal)\b/i, label: 'Animal Wrangler Needed' },
  ],
  songs: [
    { regex: /\b(song|singing|music|radio plays|orchestra|dhol|guitar|piano)\b/i, label: 'Playback / Source Music Cue' },
    { regex: /\b(dance|choreography|mukhda|antara|montage)\b/i, label: 'Musical Sequence / Playback' },
  ],
};

/**
 * Scans a scene's text for likely production elements across all 7 departments.
 */
export function detectElementsInScene(rawText: string): ProductionTags {
  const detected: ProductionTags = {
    props: [],
    costumes: [],
    vfx: [],
    stunts: [],
    extras: [],
    vehicles: [],
    songs: [],
  };
  if (!rawText.trim()) return detected;

  (Object.keys(ELEMENT_DETECTION_PATTERNS) as Array<keyof ProductionTags>).forEach((cat) => {
    for (const rule of ELEMENT_DETECTION_PATTERNS[cat]) {
      if (rule.regex.test(rawText) && !detected[cat].includes(rule.label)) {
        detected[cat].push(rule.label);
      }
    }
  });

  return detected;
}

/**
 * Aggregates every tagged item for a single department across all scenes & scheduled shoot days.
 */
export function buildDepartmentRollup(
  scenes: SceneBreakdown[],
  shootDays: ShootDay[],
  category: keyof ProductionTags
): DepartmentRollupItem[] {
  const sceneToDay = new Map<string, number>();
  for (const day of shootDays) {
    for (const sid of day.sceneIds) {
      sceneToDay.set(sid, day.dayNumber);
    }
  }

  const map = new Map<
    string,
    { item: string; scenes: Set<string>; days: Set<number>; occurrences: number }
  >();

  for (const scene of scenes) {
    if (scene.omitted) continue;
    const list = scene.productionTags[category] ?? [];
    const dayNum = sceneToDay.get(scene.sceneId);
    for (const raw of list) {
      const key = raw.toLowerCase();
      const entry = map.get(key) ?? {
        item: raw,
        scenes: new Set<string>(),
        days: new Set<number>(),
        occurrences: 0,
      };
      entry.scenes.add(scene.sceneNumber);
      if (dayNum !== undefined) entry.days.add(dayNum);
      entry.occurrences += 1;
      map.set(key, entry);
    }
  }

  return Array.from(map.values())
    .map((e) => ({
      item: e.item,
      sceneNumbers: Array.from(e.scenes),
      shootDayNumbers: Array.from(e.days).sort((a, b) => a - b),
      occurrences: e.occurrences,
    }))
    .sort((a, b) => b.occurrences - a.occurrences || a.item.localeCompare(b.item));
}

export function exportDoodCsv(report: DoodReport, shootDays: ShootDay[]): string {
  const orderedDays = [...shootDays].sort((a, b) => a.dayNumber - b.dayNumber);
  const header = [
    'Character',
    'Work Days',
    'Hold Days',
    'Span Days',
    ...orderedDays.map((d) => `Day ${d.dayNumber}`),
  ]
    .map(csvEscape)
    .join(',');

  const lines = report.rows.map((row) =>
    [
      row.characterName,
      String(row.workDays),
      String(row.holdDays),
      String(row.totalSpanDays),
      ...orderedDays.map((d) => row.codesByDayId[d.id] ?? ''),
    ]
      .map(csvEscape)
      .join(',')
  );

  return [header, ...lines].join('\n');
}

export function exportShotListCsv(shots: ShotItem[], scenes: SceneBreakdown[]): string {
  const sceneMap = new Map(scenes.map((s) => [s.sceneId, s]));
  const header = [
    'Scene #',
    'Scene Heading',
    'Shot #',
    'Size',
    'Movement',
    'Lens',
    'Setup (min)',
    'Status',
    'Description',
    'Lighting / Camera Notes',
  ]
    .map(csvEscape)
    .join(',');

  const lines = shots.map((sh) => {
    const sc = sceneMap.get(sh.sceneId);
    return [
      sc?.sceneNumber ?? '',
      sc?.heading ?? '',
      sh.shotNumber,
      sh.size,
      sh.movement,
      sh.lens,
      String(sh.setupMinutes),
      sh.completed ? 'SHOT' : 'PENDING',
      sh.description,
      sh.lightingNotes,
    ]
      .map(csvEscape)
      .join(',');
  });

  return [header, ...lines].join('\n');
}

export function exportDepartmentCsv(
  departmentLabel: string,
  items: DepartmentRollupItem[]
): string {
  const header = ['Department', 'Element', 'Occurrences', 'Scenes', 'Shoot Days']
    .map(csvEscape)
    .join(',');

  const lines = items.map((it) =>
    [
      departmentLabel,
      it.item,
      String(it.occurrences),
      it.sceneNumbers.map((n) => `#${n}`).join('; '),
      it.shootDayNumbers.map((d) => `Day ${d}`).join('; '),
    ]
      .map(csvEscape)
      .join(',')
  );

  return [header, ...lines].join('\n');
}

export function formatCallSheetText(
  day: ShootDay,
  dayScenes: SceneBreakdown[],
  titlePage: TitlePageData,
  castCalls: Record<string, CastCallEntry>,
  doodReport: DoodReport
): string {
  const totalEighths = dayScenes.reduce((acc, s) => acc + s.eighths, 0);
  const castInDay = Array.from(new Set(dayScenes.flatMap((s) => s.cast))).sort();
  const doodByChar = new Map(doodReport.rows.map((r) => [r.characterName, r]));

  const lines: string[] = [
    `========================================`,
    `CALL SHEET — ${titlePage.title || 'UNTITLED PRODUCTION'}`,
    `========================================`,
    `Shoot Day: Day ${day.dayNumber}${day.shootDate ? ` (${day.shootDate})` : ''}`,
    `General Crew Call: ${day.generalCall || '07:00'}`,
    `Location: ${day.locationAddress || dayScenes[0]?.location || 'TBD'}`,
    `Sunrise / Sunset: ${day.sunriseSunset || 'TBD'}`,
    `Nearest Hospital: ${day.nearestHospital || 'TBD'}`,
    `Total Scheduled Pages: ${formatPageEighths(totalEighths)} (${dayScenes.length} scenes)`,
    '',
    `--- SCENES ON SCHEDULE ---`,
    ...dayScenes.map(
      (s) =>
        `Sc #${s.sceneNumber} | ${s.heading} (${formatPageEighths(s.eighths)}) — Cast: ${
          s.cast.length > 0 ? s.cast.join(', ') : 'None'
        }${s.synopsis ? ` | ${s.synopsis}` : ''}`
    ),
    '',
    `--- CAST CALLS ---`,
    ...(castInDay.length > 0
      ? castInDay.map((ch) => {
          const entry = castCalls[ch];
          const code = doodByChar.get(ch)?.codesByDayId[day.id] || 'W';
          return `${ch}${entry?.actorName ? ` (${entry.actorName})` : ''} [${code}] — Call: ${
            entry?.callTime || day.generalCall || '07:00'
          } | HMW: ${entry?.hmwTime || '07:30'} | On Set: ${entry?.onSetTime || '08:15'}`;
        })
      : ['No speaking cast scheduled.']),
  ];

  if (day.weatherNotes || day.safetyNotes) {
    lines.push('', '--- WEATHER & SAFETY ---');
    if (day.weatherNotes) lines.push(`Weather: ${day.weatherNotes}`);
    if (day.safetyNotes) lines.push(`Safety: ${day.safetyNotes}`);
  }

  return lines.join('\n');
}
