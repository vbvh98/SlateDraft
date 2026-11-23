import { IndicLanguage } from '../types/screenplay';

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
