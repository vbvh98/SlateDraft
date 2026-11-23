import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Languages,
  Mic,
  MicOff,
  Play,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { CharacterProfile, IndicLanguage, ScriptBlock } from '../types/screenplay';
import { invokeRustTranslateLine } from '../services/rustBridge';
import { LANGUAGE_METADATA } from '../services/transliterationEngine';
import {
  Badge,
  Button,
  Card,
  IconButton,
  Select,
  Slider,
  Tabs,
  Textarea,
} from './ui';

export interface VoiceTranslationDrawerProps {
  open: boolean;
  onClose: () => void;
  blocks: ScriptBlock[];
  activeBlockId: string | null;
  onAppendDictatedText: (text: string) => void;
  onReplaceActiveBlockText: (text: string) => void;
  characters?: CharacterProfile[];
}

type DrawerMode = 'table-read' | 'dictation' | 'translate';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstanceLike;

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
}

interface SpokenLineItem {
  block: ScriptBlock;
  speakerName: string | null;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === 'undefined') return null;
  const win = window as WindowWithSpeech;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

function normalizeCharacterCue(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*/g, '').trim().toUpperCase();
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function isPlaceholderTranslation(output: string, source: string): boolean {
  const trimmedOut = output.trim();
  const trimmedSrc = source.trim();
  if (!trimmedOut) return true;
  if (/^\[[^\]]+\]:\s*/.test(trimmedOut)) return true;
  if (trimmedOut === trimmedSrc) return true;
  return false;
}

export const VoiceTranslationDrawer: React.FC<VoiceTranslationDrawerProps> = ({
  open,
  onClose,
  blocks,
  activeBlockId,
  onAppendDictatedText,
  onReplaceActiveBlockText,
  characters,
}) => {
  const [mode, setMode] = useState<DrawerMode>('table-read');

  // Table Read state
  const [isPlayingRead, setIsPlayingRead] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [dialogueOnlyRead, setDialogueOnlyRead] = useState(false);
  const [tableReadNotice, setTableReadNotice] = useState<string | null>(null);
  const [currentSpokenPreview, setCurrentSpokenPreview] = useState<{
    index: number;
    total: number;
    speaker: string | null;
    text: string;
  } | null>(null);
  const readSessionRef = useRef(0);

  // Dictation state
  const [isDictating, setIsDictating] = useState(false);
  const [dictationBuffer, setDictationBuffer] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [dictationNotice, setDictationNotice] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);

  // Translation state
  const [targetLang, setTargetLang] = useState<IndicLanguage>('hindi');
  const [translatedPreview, setTranslatedPreview] = useState('');
  const [translationNotice, setTranslationNotice] = useState<string | null>(null);

  useEffect(() => {
    setTranslatedPreview('');
    setTranslationNotice(null);
  }, [activeBlockId, targetLang]);

  const stopTableRead = useCallback(() => {
    readSessionRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingRead(false);
    setCurrentSpokenPreview(null);
  }, []);

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore teardown errors if recognition already ended
        }
      }
      recognitionRef.current = null;
    }
    setIsDictating(false);
    setInterimTranscript('');
  }, []);

  // Stop speech synthesis & voice capture whenever drawer closes or unmounts
  useEffect(() => {
    if (!open) {
      stopTableRead();
      stopDictation();
    }
  }, [open, stopTableRead, stopDictation]);

  useEffect(() => {
    return () => {
      stopTableRead();
      stopDictation();
    };
  }, [stopTableRead, stopDictation]);

  if (!open) return null;

  const activeBlock = blocks.find((b) => b.id === activeBlockId) ?? blocks[0];

  const handleStartTableRead = () => {
    setTableReadNotice(null);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlayingRead(false);
      setCurrentSpokenPreview(null);
      setTableReadNotice(
        'Text-to-Speech (speechSynthesis) is not supported in this browser or runtime.'
      );
      return;
    }

    // Track preceding character cue so dialogue blocks inherit per-character pitch/rate
    const spokenItems: SpokenLineItem[] = [];
    let currentSpeaker: string | null = null;

    for (const block of blocks) {
      if (block.omitted) continue;
      if (block.elementType === 'scene-heading' || block.elementType === 'section-act') {
        currentSpeaker = null;
      } else if (block.elementType === 'character') {
        const normalized = normalizeCharacterCue(block.text);
        currentSpeaker = normalized || null;
      }

      if (!block.text.trim()) continue;
      if (dialogueOnlyRead && block.elementType !== 'dialogue') continue;

      spokenItems.push({
        block,
        speakerName: block.elementType === 'dialogue' ? currentSpeaker : null,
      });
    }

    if (spokenItems.length === 0) {
      setIsPlayingRead(false);
      setCurrentSpokenPreview(null);
      setTableReadNotice(
        dialogueOnlyRead
          ? 'No readable character dialogue lines found. Uncheck "Speak Character Dialogue Only" or add dialogue blocks.'
          : 'Your script has no readable non-empty lines yet.'
      );
      return;
    }

    readSessionRef.current += 1;
    const sessionId = readSessionRef.current;

    window.speechSynthesis.cancel();
    setIsPlayingRead(true);
    setCurrentSpokenPreview({
      index: 1,
      total: spokenItems.length,
      speaker: spokenItems[0].speakerName,
      text: spokenItems[0].block.text,
    });

    spokenItems.forEach((item, idx) => {
      const utter = new SpeechSynthesisUtterance(item.block.text);

      // Apply character profile voicePitch / voiceRate when reading dialogue
      const matchedChar =
        item.speakerName && characters
          ? characters.find(
              (c) => c.name.trim().toUpperCase() === item.speakerName
            )
          : undefined;

      utter.rate = clamp(matchedChar?.voiceRate ?? speechRate, 0.5, 2.0);
      utter.pitch = clamp(matchedChar?.voicePitch ?? speechPitch, 0.5, 2.0);

      utter.onstart = () => {
        if (readSessionRef.current !== sessionId) return;
        setCurrentSpokenPreview({
          index: idx + 1,
          total: spokenItems.length,
          speaker: item.speakerName,
          text: item.block.text,
        });
      };

      utter.onerror = (event) => {
        if (readSessionRef.current !== sessionId) return;
        setIsPlayingRead(false);
        setCurrentSpokenPreview(null);
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          setTableReadNotice(
            `Table Read stopped due to a speech synthesis error (${event.error || 'unknown'}).`
          );
        }
      };

      if (idx === spokenItems.length - 1) {
        utter.onend = () => {
          if (readSessionRef.current !== sessionId) return;
          setIsPlayingRead(false);
          setCurrentSpokenPreview(null);
        };
      }

      window.speechSynthesis.speak(utter);
    });
  };

  const handleToggleDictation = () => {
    if (isDictating) {
      stopDictation();
      return;
    }

    setDictationNotice(null);
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setDictationNotice(
        'Live voice capture (Web Speech API) is unavailable in this browser or runtime. You can still type or paste into the buffer below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalChunk += transcript;
          } else {
            interimChunk += transcript;
          }
        }

        if (finalChunk.trim()) {
          setDictationBuffer((prev) => {
            const trimmedPrev = prev.trimEnd();
            const trimmedChunk = finalChunk.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedChunk}` : trimmedChunk;
          });
        }
        setInterimTranscript(interimChunk.trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setDictationNotice(
            'Microphone permission was denied. Allow microphone access and try again.'
          );
          stopDictation();
        } else if (event.error === 'no-speech') {
          setDictationNotice('No speech detected. Speak clearly or click Stop Capture.');
        } else if (event.error !== 'aborted') {
          setDictationNotice(`Voice capture error: ${event.error}.`);
          stopDictation();
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setIsDictating(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsDictating(true);
    } catch {
      recognitionRef.current = null;
      setIsDictating(false);
      setDictationNotice(
        'Could not start voice capture. Check microphone availability or type into the buffer below.'
      );
    }
  };

  const handleRunTranslation = async () => {
    if (!activeBlock || !activeBlock.text.trim()) {
      setTranslatedPreview('');
      setTranslationNotice(
        'Select a non-empty screenplay block to look up in the offline phrase lexicon.'
      );
      return;
    }
    setTranslationNotice(null);
    const res = await invokeRustTranslateLine(activeBlock.text, targetLang);
    if (isPlaceholderTranslation(res, activeBlock.text)) {
      setTranslatedPreview('');
      setTranslationNotice(
        'This line is not yet in the local offline cinema phrase lexicon. Full on-device neural translation is planned for v1.1 — you can edit the line directly or type phonetically in the editor.'
      );
      return;
    }
    setTranslatedPreview(res);
  };

  const speechSynthesisAvailable =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const speechRecognitionAvailable = Boolean(getSpeechRecognitionCtor());

  const handleCloseDrawer = () => {
    stopTableRead();
    stopDictation();
    onClose();
  };

  return (
    <aside className="no-print w-80 shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] flex flex-col h-full">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            Voice, Table-Read & Adaptation
          </span>
        </div>
        <IconButton
          icon={<X className="w-4 h-4" />}
          onClick={handleCloseDrawer}
          aria-label="Close voice drawer"
        />
      </div>

      {/* Mode Tabs */}
      <div className="p-3 border-b border-[var(--border-subtle)] flex justify-center select-none">
        <Tabs<DrawerMode>
          activeId={mode}
          onChange={setMode}
          items={[
            { id: 'table-read', label: 'Table Read' },
            { id: 'dictation', label: 'Dictation' },
            { id: 'translate', label: 'Translate' },
          ]}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mode === 'table-read' && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                On-Device Script Narration
              </span>
              <Badge variant="amber" uppercase>
                Offline TTS
              </Badge>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Listen to your screenplay paced aloud using your device&apos;s local speech synthesis
              engine. Script text never leaves your machine.
              {characters && characters.length > 0 && (
                <span className="block mt-1 text-[11px] text-amber-500">
                  Character voice pitch & rate profiles active ({characters.length} cast).
                </span>
              )}
            </p>

            {!speechSynthesisAvailable && !tableReadNotice && (
              <div
                role="status"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-500"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Speech synthesis is unavailable in this desktop WebView or browser runtime.
                </span>
              </div>
            )}

            <Slider
              label="Narration Speed (Rate)"
              value={speechRate}
              min={0.6}
              max={1.6}
              step={0.1}
              unit="x"
              onChange={setSpeechRate}
            />

            <Slider
              label="Voice Pitch Calibration"
              value={speechPitch}
              min={0.6}
              max={1.4}
              step={0.1}
              onChange={setSpeechPitch}
            />

            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dialogueOnlyRead}
                onChange={(e) => setDialogueOnlyRead(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Speak Character Dialogue Only</span>
            </label>

            {tableReadNotice && (
              <div
                role="status"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-500"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{tableReadNotice}</span>
              </div>
            )}

            {isPlayingRead && currentSpokenPreview && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-2)] border border-amber-500/35 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-amber-500">
                  <span>
                    {currentSpokenPreview.speaker
                      ? `Speaking: ${currentSpokenPreview.speaker}`
                      : 'Narrating Line'}
                  </span>
                  <span>
                    {currentSpokenPreview.index} / {currentSpokenPreview.total}
                  </span>
                </div>
                <p className="text-xs font-script text-[var(--text-primary)] line-clamp-3">
                  {currentSpokenPreview.text}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {!isPlayingRead ? (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                  onClick={handleStartTableRead}
                >
                  Start Table Read
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="md"
                  className="w-full"
                  leftIcon={<Square className="w-3.5 h-3.5" />}
                  onClick={stopTableRead}
                >
                  Stop Narration
                </Button>
              )}
            </div>
          </Card>
        )}

        {mode === 'dictation' && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Voice Dictation Capture
              </span>
              <Badge variant={isDictating ? 'emerald' : 'stone'} uppercase>
                {isDictating ? 'Listening' : 'Standby'}
              </Badge>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Dictate lines when Web Speech recognition is supported by your runtime. Note: some
              desktop WebViews do not expose browser speech recognition, and browser dictation may
              use your OS or browser speech service. The manual buffer below always stays local.
            </p>

            {!speechRecognitionAvailable && !dictationNotice && (
              <div
                role="status"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-500"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Live microphone dictation (Web Speech API) is unavailable in this runtime. You
                  can still draft or paste lines into the local buffer below.
                </span>
              </div>
            )}

            <Button
              variant={isDictating ? 'danger' : 'amber-soft'}
              size="md"
              className="w-full"
              leftIcon={
                isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />
              }
              onClick={handleToggleDictation}
            >
              {isDictating ? 'Stop Microphone Capture' : 'Start Voice Capture'}
            </Button>

            {dictationNotice && (
              <div
                role="status"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-500"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{dictationNotice}</span>
              </div>
            )}

            {isDictating && interimTranscript && (
              <div className="p-2 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] italic">
                Hearing: “{interimTranscript}”
              </div>
            )}

            <Textarea
              label="Dictation Buffer (Inline Correction)"
              rows={4}
              value={dictationBuffer}
              onChange={(e) => setDictationBuffer(e.target.value)}
              placeholder="Spoken or drafted lines appear here for review before insertion..."
            />

            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={!dictationBuffer.trim()}
              leftIcon={<Check className="w-3.5 h-3.5" />}
              onClick={() => {
                if (dictationBuffer.trim()) {
                  onAppendDictatedText(dictationBuffer.trim());
                  setDictationBuffer('');
                }
              }}
            >
              Insert into Active Block
            </Button>
          </Card>
        )}

        {mode === 'translate' && (
          <Card className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                Phrase Lexicon (Beta — Full On-Device Model in v1.1)
              </span>
              <Badge variant="amber" uppercase className="shrink-0">
                Beta
              </Badge>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Look up common cinema phrases in the local offline lexicon without overwriting your
              original text until confirmed. Runs 100% locally with zero network requests.
            </p>

            <div className="p-2.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs font-script text-[var(--text-primary)]">
              {activeBlock?.text.trim() || '(Select a non-empty block in the editor)'}
            </div>

            <Select<IndicLanguage>
              label="Target Language"
              leftIcon={<Languages className="w-3.5 h-3.5" />}
              value={targetLang}
              onChange={setTargetLang}
              options={(Object.keys(LANGUAGE_METADATA) as IndicLanguage[]).map((k) => ({
                value: k,
                label: `${LANGUAGE_METADATA[k].label} (${LANGUAGE_METADATA[k].nativeLabel})`,
              }))}
            />

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              leftIcon={<Languages className="w-3.5 h-3.5" />}
              onClick={handleRunTranslation}
            >
              Check Offline Phrase Lexicon
            </Button>

            {translationNotice && (
              <div
                role="status"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-500"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{translationNotice}</span>
              </div>
            )}

            {translatedPreview && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <Textarea
                  label="Lexicon Match (Editable)"
                  rows={3}
                  value={translatedPreview}
                  onChange={(e) => setTranslatedPreview(e.target.value)}
                />
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onReplaceActiveBlockText(translatedPreview);
                    setTranslatedPreview('');
                  }}
                >
                  Apply to Active Block
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </aside>
  );
};
