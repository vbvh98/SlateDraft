export type ElementType =
  | 'scene-heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'shot'
  | 'song-lyric'
  | 'note'
  | 'section-act';

export type IndicLanguage =
  | 'hindi'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'marathi'
  | 'bengali'
  | 'gujarati'
  | 'punjabi'
  | 'hinglish'
  | 'english';

export type RevisionColor =
  | 'white'
  | 'blue'
  | 'pink'
  | 'yellow'
  | 'green'
  | 'goldenrod'
  | 'buff'
  | 'salmon'
  | 'cherry';

export type NavarasaTag =
  | 'shringara'
  | 'hasya'
  | 'karuna'
  | 'raudra'
  | 'veera'
  | 'bhayanaka'
  | 'bibhatsa'
  | 'adbhuta'
  | 'shanta';

export type StudioTheme = 'obsidian' | 'sahitya' | 'neel';

export type WorkspaceView =
  | 'screenplay'
  | 'av-split'
  | 'beat-board'
  | 'characters'
  | 'production'
  | 'templates';

export interface ProductionTags {
  props: string[];
  costumes: string[];
  vfx: string[];
  stunts: string[];
  extras: string[];
  vehicles: string[];
  songs: string[];
}

export type ShotSize =
  | 'WIDE'
  | 'FULL'
  | 'MEDIUM'
  | 'CLOSE-UP'
  | 'ECU'
  | 'OTS'
  | 'TWO-SHOT'
  | 'INSERT';

export type CameraMovement =
  | 'STATIC'
  | 'DOLLY'
  | 'STEADICAM'
  | 'HANDHELD'
  | 'PAN / TILT'
  | 'CRANE'
  | 'DRONE';

export interface ShotItem {
  id: string;
  sceneId: string;
  shotNumber: string;
  size: ShotSize;
  movement: CameraMovement;
  lens: string;
  description: string;
  setupMinutes: number;
  lightingNotes: string;
  completed: boolean;
}

export interface ShootDay {
  id: string;
  dayNumber: number;
  label: string;
  shootDate: string;
  generalCall: string;
  locationAddress: string;
  nearestHospital: string;
  sunriseSunset: string;
  weatherNotes: string;
  safetyNotes: string;
  sceneIds: string[];
}

export interface CastCallEntry {
  characterName: string;
  actorName: string;
  callTime: string;
  hmwTime: string;
  onSetTime: string;
}

export interface CrewContact {
  role: string;
  name: string;
  phone: string;
}

export interface ProductionState {
  shootDays: ShootDay[];
  shots: ShotItem[];
  castCalls: Record<string, CastCallEntry>;
  crewContacts?: CrewContact[];
}

export interface ScriptBlock {
  id: string;
  elementType: ElementType;
  text: string;
  sceneNumber?: string;
  locked: boolean;
  omitted: boolean;
  revisionColor: RevisionColor;
  isDualDialogue: boolean;
  synopsis?: string;
  rasa?: NavarasaTag;
  actMarker?: string;
  productionTags?: ProductionTags;
}

export interface AVRow {
  id: string;
  cueNumber: string;
  durationSeconds: number;
  shotType: 'WIDE' | 'MID' | 'CLOSE-UP' | 'DRONE' | 'TRACKING' | 'INSERT' | 'MONTAGE' | 'SUPER';
  visualText: string;
  audioSpeaker: string;
  audioType: 'VO' | 'SYNC' | 'SFX' | 'MUSIC';
  audioText: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  nativeName: string;
  roleArchetype: 'Protagonist' | 'Antagonist' | 'Deuteragonist' | 'Catalyst' | 'Supporting' | 'Cameo';
  ageRange: string;
  dialectNotes: string;
  motivation: string;
  arcSummary: string;
  voicePitch: number;
  voiceRate: number;
}

export interface TitlePageData {
  title: string;
  nativeTitle: string;
  logline: string;
  writtenBy: string;
  storyBy: string;
  dialoguesBy: string;
  lyricsBy: string;
  productionHouse: string;
  swaRegistrationNumber: string;
  draftName: string;
  draftDate: string;
  contactInfo: string;
  watermarkText: string;
  watermarkEnabled: boolean;
}

export interface TransliterationResult {
  input: string;
  primary: string;
  candidates: string[];
  language: IndicLanguage;
  latencyMicros: number;
}

export interface CharacterAnalytics {
  name: string;
  dialogueBlocks: number;
  wordCount: number;
  sceneAppearances: number;
  estimatedSpeakingSeconds: number;
}

export interface LocationAnalytics {
  location: string;
  intExt: string;
  sceneCount: number;
  dayScenes: number;
  nightScenes: number;
  totalEighths: number;
}

export interface ScriptAnalyticsReport {
  totalBlocks: number;
  totalScenes: number;
  totalWords: number;
  totalPages: number;
  totalEighths: number;
  formattedEighths: string;
  estimatedRuntimeMinutes: number;
  latinStandardMinutes: number;
  indicCalibrationFactor: number;
  dialoguePercentage: number;
  actionPercentage: number;
  songCount: number;
  characters: CharacterAnalytics[];
  locations: LocationAnalytics[];
}

export interface ScriptTemplate {
  id: string;
  name: string;
  nativeSubtitle: string;
  category: 'Indian Cinema' | 'OTT & Series' | 'Commercial & AV' | 'International & Indie' | 'Stage & Short';
  targetWorkspace: 'screenplay' | 'av-split';
  defaultLanguage: IndicLanguage;
  estimatedLength: string;
  structureType: string;
  description: string;
  badges: string[];
  titlePage: Partial<TitlePageData>;
  blocks: ScriptBlock[];
  avRows?: AVRow[];
  characters?: CharacterProfile[];
}
