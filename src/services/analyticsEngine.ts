import {
  CharacterAnalytics,
  IndicLanguage,
  LocationAnalytics,
  NavarasaTag,
  ScriptAnalyticsReport,
  ScriptBlock,
} from '../types/screenplay';
import { LANGUAGE_METADATA } from './transliterationEngine';

export const NAVARASA_META: Record<
  NavarasaTag,
  { name: string; hindi: string; meaning: string; colorClass: string; badgeBg: string }
> = {
  shringara: {
    name: 'Shringara',
    hindi: 'श्रृंगार',
    meaning: 'Romance & Beauty',
    colorClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  hasya: {
    name: 'Hasya',
    hindi: 'हास्य',
    meaning: 'Comedy & Warmth',
    colorClass: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  karuna: {
    name: 'Karuna',
    hindi: 'करुण',
    meaning: 'Pathos & Grief',
    colorClass: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  raudra: {
    name: 'Raudra',
    hindi: 'रौद्र',
    meaning: 'Fury & Conflict',
    colorClass: 'text-red-400',
    badgeBg: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
  veera: {
    name: 'Veera',
    hindi: 'वीर',
    meaning: 'Heroism & Resolve',
    colorClass: 'text-orange-400',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  bhayanaka: {
    name: 'Bhayanaka',
    hindi: 'भयानक',
    meaning: 'Suspense & Dread',
    colorClass: 'text-purple-400',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  bibhatsa: {
    name: 'Bibhatsa',
    hindi: 'बीभत्स',
    meaning: 'Gritty / Shock',
    colorClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  adbhuta: {
    name: 'Adbhuta',
    hindi: 'अद्भुत',
    meaning: 'Wonder & Twist',
    colorClass: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  shanta: {
    name: 'Shanta',
    hindi: 'शांत',
    meaning: 'Peace & Catharsis',
    colorClass: 'text-teal-400',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
};

export function formatPageEighths(eighths: number): string {
  const safe = Math.max(1, Math.round(eighths));
  const whole = Math.floor(safe / 8);
  const rem = safe % 8;
  if (whole === 0) return `${rem}/8 pgs`;
  if (rem === 0) return `${whole} pgs`;
  return `${whole} ${rem}/8 pgs`;
}

export function analyzeScriptSync(
  blocks: ScriptBlock[],
  language: IndicLanguage
): ScriptAnalyticsReport {
  const calibrationFactor = LANGUAGE_METADATA[language]?.calibration ?? 1.0;

  let totalWords = 0;
  let dialogueWords = 0;
  let actionWords = 0;
  let totalScenes = 0;
  let songCount = 0;
  let estimatedLines = 0;

  const charStats = new Map<
    string,
    { dialogueBlocks: number; wordCount: number; scenes: Set<number> }
  >();
  const locStats = new Map<
    string,
    { intExt: string; sceneCount: number; dayScenes: number; nightScenes: number; eighths: number }
  >();

  let currentSceneIdx = 0;
  let currentCharacter: string | null = null;
  let currentLocationKey: string | null = null;

  for (const block of blocks) {
    if (block.omitted) continue;
    const words = block.text.trim() ? block.text.trim().split(/\s+/).length : 0;
    totalWords += words;

    let blockLines = 1;
    switch (block.elementType) {
      case 'scene-heading':
        blockLines = 2;
        break;
      case 'action':
        blockLines = Math.max(1, Math.ceil(words / 10)) + 1;
        break;
      case 'character':
      case 'parenthetical':
        blockLines = 1;
        break;
      case 'dialogue':
        blockLines = Math.max(1, Math.ceil(words / 7)) + 1;
        break;
      case 'song-lyric':
        blockLines = Math.max(2, block.text.split('\n').length) + 1;
        break;
      case 'note':
        blockLines = 0;
        break;
      default:
        blockLines = 2;
        break;
    }
    estimatedLines += blockLines;

    if (block.elementType === 'scene-heading') {
      totalScenes += 1;
      currentSceneIdx = totalScenes;
      currentCharacter = null;

      const upper = block.text.trim().toUpperCase();
      const intExt =
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
        upper.includes('रात');

      const locClean = upper
        .replace(/^(INT\.\/EXT\.|INT\.|EXT\.|I\/E)\s*/, '')
        .split('-')[0]
        .trim();
      const locKey = locClean || 'UNSPECIFIED LOCATION';
      currentLocationKey = locKey;

      const existing = locStats.get(locKey) ?? {
        intExt,
        sceneCount: 0,
        dayScenes: 0,
        nightScenes: 0,
        eighths: 0,
      };
      existing.sceneCount += 1;
      if (isNight) existing.nightScenes += 1;
      else existing.dayScenes += 1;
      existing.eighths += 1;
      locStats.set(locKey, existing);
    } else if (block.elementType === 'character') {
      const cleanName = block.text.split('(')[0].trim().toUpperCase();
      if (cleanName) {
        currentCharacter = cleanName;
        const entry = charStats.get(cleanName) ?? {
          dialogueBlocks: 0,
          wordCount: 0,
          scenes: new Set<number>(),
        };
        if (currentSceneIdx > 0) entry.scenes.add(currentSceneIdx);
        charStats.set(cleanName, entry);
      }
    } else if (block.elementType === 'dialogue') {
      dialogueWords += words;
      if (currentCharacter) {
        const entry = charStats.get(currentCharacter);
        if (entry) {
          entry.dialogueBlocks += 1;
          entry.wordCount += words;
        }
      }
    } else if (block.elementType === 'action' || block.elementType === 'shot') {
      actionWords += words;
    } else if (block.elementType === 'song-lyric') {
      songCount += 1;
      dialogueWords += words;
    }

    if (currentLocationKey && block.elementType !== 'scene-heading') {
      const lEntry = locStats.get(currentLocationKey);
      if (lEntry && blockLines >= 6) {
        lEntry.eighths += Math.floor(blockLines / 6);
      }
    }
  }

  const totalPages = Math.max(0.125, Number((estimatedLines / 54).toFixed(2)));
  const totalEighths = Math.max(1, Math.round(totalPages * 8));
  const formattedEighths = formatPageEighths(totalEighths);

  const latinStandardMinutes = Number(totalPages.toFixed(1));
  const songBonusMinutes = songCount * 0.45;
  const estimatedRuntimeMinutes = Number(
    (latinStandardMinutes * calibrationFactor + songBonusMinutes).toFixed(1)
  );

  const activeWords = Math.max(1, dialogueWords + actionWords);
  const dialoguePercentage = Number(((dialogueWords / activeWords) * 100).toFixed(1));
  const actionPercentage = Number(((actionWords / activeWords) * 100).toFixed(1));

  const characters: CharacterAnalytics[] = Array.from(charStats.entries())
    .map(([name, st]) => ({
      name,
      dialogueBlocks: st.dialogueBlocks,
      wordCount: st.wordCount,
      sceneAppearances: Math.max(1, st.scenes.size),
      estimatedSpeakingSeconds: Math.round((st.wordCount / 140) * 60 * calibrationFactor),
    }))
    .sort((a, b) => b.wordCount - a.wordCount);

  const locations: LocationAnalytics[] = Array.from(locStats.entries())
    .map(([location, st]) => ({
      location,
      intExt: st.intExt,
      sceneCount: st.sceneCount,
      dayScenes: st.dayScenes,
      nightScenes: st.nightScenes,
      totalEighths: Math.max(1, st.eighths),
    }))
    .sort((a, b) => b.sceneCount - a.sceneCount);

  return {
    totalBlocks: blocks.length,
    totalScenes,
    totalWords,
    totalPages,
    totalEighths,
    formattedEighths,
    estimatedRuntimeMinutes,
    latinStandardMinutes,
    indicCalibrationFactor: calibrationFactor,
    dialoguePercentage,
    actionPercentage,
    songCount,
    characters,
    locations,
  };
}

export function translateScriptLineSync(text: string, target: IndicLanguage): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();

  const phraseBank: Array<{
    match: (s: string) => boolean;
    translations: Record<IndicLanguage, string>;
  }> = [
    {
      match: (s) => s.includes('train') || s.includes('ट्रेन') || s.includes('लोकल'),
      translations: {
        hindi: 'रुको! तुम्हारी आखिरी लोकल ट्रेन छूट रही है!',
        hinglish: 'Ruko! Tumhari aakhri local train chhoot rahi hai!',
        tamil: 'நில்லு! உன் கடைசி ரயில் புறப்படுகிறது!',
        telugu: 'ఆగు! నీ చివరి రైలు వెళ్ళిపోతోంది!',
        kannada: 'ನಿಲ್ಲು! ನಿನ್ನ ಕೊನೆಯ ರೈಲು ಹೊರಡುತ್ತಿದೆ!',
        malayalam: 'നിൽക്കൂ! നിങ്ങളുടെ അവസാന ട്രെയിൻ പുറപ്പെടുന്നു!',
        marathi: 'थांब! तुझी शेवटची लोकल ट्रेन सुटतेय!',
        bengali: 'থামো! তোমার শেষ লোকাল ট্রেন ছেড়ে যাচ্ছে!',
        gujarati: 'થોભો! તમારી છેલ્લી લોકલ ટ્રેન ઉપડી રહી છે!',
        punjabi: 'ਰੁਕੋ! ਤੁਹਾਡੀ ਆਖਰੀ ਟ੍ਰੇਨ ਛੁੱਟ ਰਹੀ ਹੈ!',
        english: 'Wait! Your last local train is pulling out of the platform!',
      },
    },
    {
      match: (s) => s.includes('mumbai') || s.includes('मुंबई') || s.includes('शहर') || s.includes('city'),
      translations: {
        hindi: 'यह मुंबई है साहब, यहाँ समंदर और सपने कभी नहीं सोते।',
        hinglish: 'Yeh Mumbai hai sahab, yahan samandar aur sapne kabhi nahi sote.',
        tamil: 'இது மும்பை சார், இங்கே கடலும் கனவுகளும் உறங்குவதில்லை.',
        telugu: 'ఇది ముంబై సార్, ఇక్కడ సముద్రం మరియు కలలు ఎప్పుడూ నిద్రపోవు.',
        kannada: 'ಇದು ಮುಂಬೈ ಸರ್, ಇಲ್ಲಿ ಸಮುದ್ರ ಮತ್ತು ಕನಸುಗಳು ಎಂದಿಗೂ ಮಲಗುವುದಿಲ್ಲ.',
        malayalam: 'ഇത് മുംബൈയാണ് സാർ, ഇവിടെ കടലും സ്വപ്നങ്ങളും ഒരിക്കലും ഉറങ്ങുന്നില്ല.',
        marathi: 'ही मुंबई आहे साहेब, इथे समुद्र आणि स्वप्नं कधीच झोपत नाहीत.',
        bengali: 'এটা মুম্বাই সাহেব, এখানে সমুদ্র আর স্বপ্ন কখনো ঘুমায় না।',
        gujarati: 'આ મુંબઈ છે સાહેબ, અહીં દરિયો અને સપના ક્યારેય સૂતા નથી.',
        punjabi: 'ਇਹ ਮੁੰਬਈ ਹੈ ਸਾਹਿਬ, ਇੱਥੇ ਸਮੁੰਦਰ ਅਤੇ ਸੁਪਨੇ ਕਦੇ ਨਹੀਂ ਸੌਂਦੇ।',
        english: 'This is Mumbai, sir — the sea and its dreams never sleep here.',
      },
    },
  ];

  for (const item of phraseBank) {
    if (item.match(lower)) {
      return item.translations[target];
    }
  }

  // Word-by-word assistive adaptation fallback
  const meta = LANGUAGE_METADATA[target];
  return `[${meta.nativeLabel} Adaptation]: ${trimmed}`;
}
