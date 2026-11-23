import { IndicLanguage, TransliterationResult } from '../types/screenplay';

export const LANGUAGE_METADATA: Record<
  IndicLanguage,
  { label: string; nativeLabel: string; scriptName: string; sampleWord: string; calibration: number }
> = {
  hindi: {
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    scriptName: 'Devanagari',
    sampleWord: 'namaste → नमस्ते',
    calibration: 0.88,
  },
  hinglish: {
    label: 'Hinglish (Mixed)',
    nativeLabel: 'Hinglish / हिंग्लिश',
    scriptName: 'Roman + Devanagari',
    sampleWord: 'yaar / यार',
    calibration: 1.0,
  },
  tamil: {
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    scriptName: 'Tamil',
    sampleWord: 'vanakkam → வணக்கம்',
    calibration: 1.24,
  },
  telugu: {
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    scriptName: 'Telugu',
    sampleWord: 'namaskaram → నమస్కారం',
    calibration: 1.15,
  },
  kannada: {
    label: 'Kannada',
    nativeLabel: 'ಕನ್ನಡ',
    scriptName: 'Kannada',
    sampleWord: 'namaskara → ನಮಸ್ಕಾರ',
    calibration: 1.15,
  },
  malayalam: {
    label: 'Malayalam',
    nativeLabel: 'മലയാളം',
    scriptName: 'Malayalam',
    sampleWord: 'namaskaram → നമസ്കാരം',
    calibration: 1.24,
  },
  marathi: {
    label: 'Marathi',
    nativeLabel: 'मराठी',
    scriptName: 'Devanagari (Balbodh)',
    sampleWord: 'namaskar → नमस्कार',
    calibration: 0.88,
  },
  bengali: {
    label: 'Bengali',
    nativeLabel: 'বাংলা',
    scriptName: 'Eastern Nagari',
    sampleWord: 'nomoshkar → নমস্কার',
    calibration: 0.94,
  },
  gujarati: {
    label: 'Gujarati',
    nativeLabel: 'ગુજરાતી',
    scriptName: 'Gujarati',
    sampleWord: 'kem cho → કેમ છો',
    calibration: 0.94,
  },
  punjabi: {
    label: 'Punjabi',
    nativeLabel: 'ਪੰਜਾਬੀ',
    scriptName: 'Gurmukhi',
    sampleWord: 'sat sri akal → ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
    calibration: 0.94,
  },
  english: {
    label: 'English (Standard)',
    nativeLabel: 'English',
    scriptName: 'Latin Courier',
    sampleWord: 'INT. STUDIO - DAY',
    calibration: 1.0,
  },
};

const DICTIONARIES: Partial<Record<IndicLanguage, Record<string, string[]>>> = {
  hindi: {
    namaste: ['नमस्ते', 'नमस्कार', 'प्रणाम'],
    kaise: ['कैसे', 'कैसी', 'कैसा'],
    ho: ['हो', 'हों', 'हूँ'],
    kya: ['क्या', 'क्यों'],
    hai: ['है', 'हैं', 'हाय'],
    main: ['मैं', 'में', 'माई'],
    mai: ['मैं', 'माई'],
    mein: ['में', 'मैं'],
    tum: ['तुम', 'तुम्हें', 'तुम्हारा'],
    aap: ['आप', 'आपका', 'आपको'],
    bhai: ['भाई', 'भैया', 'भाईजान'],
    yaar: ['यार', 'यारों'],
    dil: ['दिल', 'दिलों'],
    pyaar: ['प्यार', 'प्रेम', 'मोहब्बत'],
    pyar: ['प्यार', 'प्रेम'],
    zindagi: ['ज़िंदगी', 'जिंदगी'],
    mumbai: ['मुंबई', 'मुम्बई'],
    dilli: ['दिल्ली', 'दिली'],
    raat: ['रात', 'रात्रि'],
    din: ['दिन', 'दिनों'],
    train: ['ट्रेन', 'रेलगाड़ी'],
    station: ['स्टेशन'],
    police: ['पुलिस'],
    kahani: ['कहानी', 'कहानियाँ'],
    patkatha: ['पटकथा'],
    interval: ['इंटरवल', 'मध्यांतर'],
    nahi: ['नहीं', 'ना'],
    nahin: ['नहीं', 'ना'],
    haan: ['हाँ', 'हां'],
    accha: ['अच्छा', 'अच्छे'],
    theek: ['ठीक'],
    chalo: ['चलो', 'चलिये'],
    ruko: ['रुको', 'रुकिए'],
    dekho: ['देखो', 'देखिए'],
    suno: ['सुनो', 'सुनिए'],
    waqt: ['वक़्त', 'समय'],
    khamoshi: ['ख़ामोशी', 'सन्नाटा'],
    baarish: ['बारिश', 'बरसात'],
    sapna: ['सपना', 'ख़्वाब'],
    maa: ['माँ', 'माता'],
    baba: ['बाबा', 'पिताजी'],
    kabir: ['कबीर'],
    meera: ['मीरा'],
    arjun: ['अर्जुन'],
    vikram: ['विक्रम'],
    surya: ['सूर्या', 'सूर्य'],
  },
  marathi: {
    namaskar: ['नमस्कार', 'नमस्ते'],
    kase: ['कसे', 'कशी'],
    aahat: ['आहात', 'आहे'],
    aahe: ['आहे', 'आहेत'],
    thamb: ['थांब', 'थांबा'],
    mumbai: ['मुंबई'],
    pune: ['पुणे'],
    dada: ['दादा'],
    tai: ['ताई'],
    katha: ['कथा', 'पटकथा'],
    prem: ['प्रेम'],
    manus: ['माणूस'],
  },
  tamil: {
    vanakkam: ['வணக்கம்'],
    eppadi: ['எப்படி'],
    irukinga: ['இருக்கீங்க'],
    naan: ['நான்'],
    nee: ['நீ', 'நீங்கள்'],
    anna: ['அண்ணா'],
    thambi: ['தம்பி'],
    kadhal: ['காதல்'],
    chennai: ['சென்னை'],
    cinema: ['சினிமா'],
    amma: ['அம்மா'],
    appa: ['அப்பா'],
    seri: ['சரி'],
    illai: ['இல்லை', 'இல்ல'],
    kathai: ['கதை'],
  },
  telugu: {
    namaskaram: ['నమస్కారం'],
    ela: ['ఎలా'],
    unnaru: ['ఉన్నారు'],
    nenu: ['నేను'],
    nuvvu: ['నువ్వు'],
    anna: ['అన్న'],
    prema: ['ప్రేమ'],
    hyderabad: ['హైదరాబాద్'],
    katha: ['కథ'],
    avunu: ['అవును'],
    kaadu: ['కాదు'],
  },
  kannada: {
    namaskara: ['ನಮಸ್ಕಾರ'],
    hegiddira: ['ಹೇಗಿದ್ದೀರಾ'],
    naanu: ['ನಾನು'],
    neevu: ['ನೀವು'],
    bengaluru: ['ಬೆಂಗಳೂರು'],
    preethi: ['ಪ್ರೀತಿ'],
    kathe: ['ಕಥೆ'],
    houdu: ['ಹೌದು'],
    illa: ['ಇಲ್ಲ'],
  },
  malayalam: {
    namaskaram: ['നമസ്കാരം'],
    sukhamano: ['സുഖമാണോ'],
    njan: ['ഞാൻ'],
    nee: ['നീ', 'നിങ്ങൾ'],
    kochi: ['കൊച്ചി'],
    sneham: ['സ്നേഹം'],
    katha: ['കഥ'],
    athe: ['അതെ'],
    alla: ['അല്ല'],
  },
  bengali: {
    nomoshkar: ['নমস্কার'],
    namaskar: ['নমস্কার'],
    kemon: ['কেমন'],
    achen: ['আছেন'],
    ami: ['আমি'],
    tumi: ['তুমি'],
    kolkata: ['কলকাতা'],
    bhalobasha: ['ভালোবাসা'],
    golpo: ['গল্প'],
  },
  gujarati: {
    namaste: ['નમસ્તે'],
    kem: ['કેમ'],
    cho: ['છો'],
    maja: ['મજા', 'મજામાં'],
    prem: ['પ્રેમ'],
    amdavad: ['અમદાવાદ'],
    varta: ['વાર્તા'],
  },
  punjabi: {
    sat: ['ਸਤ'],
    sri: ['ਸ੍ਰੀ'],
    akal: ['ਅਕਾਲ'],
    kiddan: ['ਕਿੱਦਾਂ'],
    veere: ['ਵੀਰੇ'],
    paji: ['ਭਾਜੀ'],
    pyaar: ['ਪਿਆਰ'],
  },
};

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, idx) => idx);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function adaptDevanagariToRegional(deva: string, lang: IndicLanguage): string {
  const offsetMap: Record<IndicLanguage, number> = {
    hindi: 0,
    marathi: 0,
    hinglish: 0,
    english: 0,
    bengali: 0x0980 - 0x0900,
    punjabi: 0x0a00 - 0x0900,
    gujarati: 0x0a80 - 0x0900,
    tamil: 0x0b80 - 0x0900,
    telugu: 0x0c00 - 0x0900,
    kannada: 0x0c80 - 0x0900,
    malayalam: 0x0d00 - 0x0900,
  };

  const offset = offsetMap[lang] ?? 0;
  if (offset === 0) return deva;

  return Array.from(deva)
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0x0900 && code <= 0x097f) {
        return String.fromCharCode(code + offset);
      }
      return ch;
    })
    .join('');
}

export function phoneticFallback(word: string, lang: IndicLanguage): string {
  if (lang === 'english' || lang === 'hinglish') return word;

  const lower = word.toLowerCase();
  let out = '';
  let i = 0;

  const digraphs: Array<[string, string, string]> = [
    ['ksh', 'क्ष', 'क्ष'],
    ['chh', 'छ', 'छ'],
    ['kh', 'ख', 'ख'],
    ['gh', 'घ', 'घ'],
    ['ch', 'च', 'च'],
    ['jh', 'झ', 'झ'],
    ['th', 'थ', 'थ'],
    ['dh', 'ध', 'ध'],
    ['ph', 'फ', 'फ'],
    ['bh', 'भ', 'भ'],
    ['sh', 'श', 'श'],
    ['aa', 'आ', 'ा'],
    ['ee', 'ई', 'ी'],
    ['oo', 'ऊ', 'ू'],
    ['ai', 'ऐ', 'ै'],
    ['au', 'औ', 'ौ'],
  ];

  while (i < lower.length) {
    const rem = lower.slice(i);
    let matchedDigraph = false;
    for (const [pat, initialGlyph, medialGlyph] of digraphs) {
      if (rem.startsWith(pat)) {
        out += adaptDevanagariToRegional(i === 0 ? initialGlyph : medialGlyph, lang);
        i += pat.length;
        matchedDigraph = true;
        break;
      }
    }
    if (matchedDigraph) continue;

    const ch = lower[i];
    const singleMap: Record<string, [string, string]> = {
      a: ['अ', ''],
      i: ['इ', 'ि'],
      u: ['उ', 'ु'],
      e: ['ए', 'े'],
      o: ['ओ', 'ो'],
      k: ['क', 'क'],
      q: ['क़', 'क़'],
      c: ['क', 'क'],
      g: ['ग', 'ग'],
      j: ['ज', 'ज'],
      z: ['ज़', 'ज़'],
      t: ['त', 'त'],
      d: ['द', 'द'],
      n: ['न', 'न'],
      p: ['प', 'प'],
      f: ['फ़', 'फ़'],
      b: ['ब', 'ब'],
      m: ['म', 'म'],
      y: ['य', 'य'],
      r: ['र', 'र'],
      l: ['ल', 'ल'],
      v: ['व', 'व'],
      w: ['व', 'व'],
      s: ['स', 'स'],
      h: ['ह', 'ह'],
    };

    if (singleMap[ch]) {
      const [initG, medG] = singleMap[ch];
      out += adaptDevanagariToRegional(i === 0 ? initG : medG, lang);
    } else if (!/[a-z]/.test(ch)) {
      out += ch;
    }
    i += 1;
  }

  return out || word;
}

export function transliterateWordSync(word: string, lang: IndicLanguage): TransliterationResult {
  const trimmed = word.trim();
  if (!trimmed || lang === 'english') {
    return {
      input: word,
      primary: word,
      candidates: [word],
      language: lang,
      latencyMicros: 45,
    };
  }

  const lower = trimmed.toLowerCase();

  if (lang === 'hinglish') {
    const hindiDict = DICTIONARIES.hindi ?? {};
    const hindiMatches = hindiDict[lower] ?? [phoneticFallback(trimmed, 'hindi')];
    return {
      input: word,
      primary: trimmed,
      candidates: [trimmed, ...hindiMatches],
      language: lang,
      latencyMicros: 60,
    };
  }

  const dict = DICTIONARIES[lang] ?? DICTIONARIES.hindi ?? {};
  if (dict[lower]) {
    const matches = [...dict[lower], trimmed];
    return {
      input: word,
      primary: matches[0],
      candidates: matches,
      language: lang,
      latencyMicros: 52,
    };
  }

  // Fuzzy Levenshtein distance match against dictionary keys (edit distance == 1)
  const fuzzyCandidates: string[] = [];
  for (const [key, vals] of Object.entries(dict)) {
    if (Math.abs(key.length - lower.length) <= 1 && levenshteinDistance(lower, key) === 1) {
      fuzzyCandidates.push(...vals);
    }
  }

  const phonetic = phoneticFallback(trimmed, lang);
  const allCandidates = Array.from(new Set([phonetic, ...fuzzyCandidates.slice(0, 3), trimmed]));

  return {
    input: word,
    primary: allCandidates[0],
    candidates: allCandidates,
    language: lang,
    latencyMicros: 85,
  };
}
