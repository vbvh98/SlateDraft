import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Flag,
  LayoutGrid,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { NavarasaTag, ScriptBlock } from '../types/screenplay';
import { NAVARASA_META } from '../services/analyticsEngine';
import {
  Badge,
  Button,
  Card,
  IconButton,
  Select,
  Textarea,
  WorkspaceHeader,
} from './ui';

interface BeatBoardProps {
  blocks: ScriptBlock[];
  onUpdateSceneSynopsis: (sceneId: string, synopsis: string) => void;
  onUpdateSceneRasa: (sceneId: string, rasa: NavarasaTag | undefined) => void;
  onMoveScene: (sceneId: string, direction: 'up' | 'down') => void;
  onJumpToSceneInEditor: (sceneId: string) => void;
  onAddSceneCard: () => void;
  onInsertIntervalStructure: () => void;
}

const NAVARASA_ACCENT_BAR: Record<NavarasaTag, string> = {
  shringara: 'bg-rose-500',
  hasya: 'bg-amber-400',
  karuna: 'bg-sky-500',
  raudra: 'bg-red-500',
  veera: 'bg-orange-500',
  bhayanaka: 'bg-purple-500',
  bibhatsa: 'bg-emerald-500',
  adbhuta: 'bg-indigo-500',
  shanta: 'bg-teal-500',
};

export const BeatBoard: React.FC<BeatBoardProps> = ({
  blocks,
  onUpdateSceneSynopsis,
  onUpdateSceneRasa,
  onMoveScene,
  onJumpToSceneInEditor,
  onAddSceneCard,
  onInsertIntervalStructure,
}) => {
  const [filterRasa, setFilterRasa] = useState<NavarasaTag | 'all'>('all');

  const sceneAndActBlocks = blocks.filter(
    (b) => b.elementType === 'scene-heading' || b.elementType === 'section-act'
  );

  const sceneBlocks = sceneAndActBlocks.filter((b) => b.elementType === 'scene-heading');

  const matchingSceneCount =
    filterRasa === 'all'
      ? sceneBlocks.length
      : sceneBlocks.filter((b) => b.rasa === filterRasa).length;

  const visibleCards =
    filterRasa !== 'all' && matchingSceneCount === 0
      ? []
      : sceneAndActBlocks.filter((b) => {
          if (filterRasa === 'all') return true;
          if (b.elementType === 'section-act') return true;
          return b.rasa === filterRasa;
        });

  const getSceneWordCount = (sceneBlockId: string): number => {
    const startIdx = blocks.findIndex((b) => b.id === sceneBlockId);
    if (startIdx === -1) return 0;
    let words = 0;
    for (let i = startIdx + 1; i < blocks.length; i++) {
      if (
        blocks[i].elementType === 'scene-heading' ||
        blocks[i].elementType === 'section-act'
      ) {
        break;
      }
      words += blocks[i].text.trim() ? blocks[i].text.trim().split(/\s+/).length : 0;
    }
    return words;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <WorkspaceHeader
        title="Beat Board, Index Cards & Structural Timeline"
        subtitle="Plan scene beats, write index card synopses, tag emotional tones, and structure Pre/Post-Interval acts."
        icon={<LayoutGrid className="w-4 h-4" />}
        actions={
          <>
            <Select<NavarasaTag | 'all'>
              ariaLabel="Filter Emotional Tone"
              value={filterRasa}
              onChange={setFilterRasa}
              options={[
                { value: 'all', label: 'All Emotional Tones' },
                ...(Object.keys(NAVARASA_META) as NavarasaTag[]).map((key) => ({
                  value: key,
                  label: `${NAVARASA_META[key].name} — ${NAVARASA_META[key].meaning}`,
                })),
              ]}
            />

            <Button
              variant="secondary"
              size="md"
              leftIcon={<Flag className="w-3.5 h-3.5 text-amber-500" />}
              onClick={onInsertIntervalStructure}
            >
              Add Interval Marker
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={onAddSceneCard}
            >
              New Scene Card
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {visibleCards.length === 0 ? (
          <div className="max-w-lg mx-auto mt-10">
            <Card className="p-10 text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
                {filterRasa !== 'all' ? (
                  <Sparkles className="w-5 h-5 text-amber-500" />
                ) : (
                  <LayoutGrid className="w-5 h-5 text-amber-500" />
                )}
              </div>

              {filterRasa !== 'all' ? (
                <>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      No scenes match this emotional tone
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      No scene cards are currently tagged with{' '}
                      <span className="font-medium text-[var(--text-secondary)]">
                        {NAVARASA_META[filterRasa].name} ({NAVARASA_META[filterRasa].meaning})
                      </span>
                      .
                    </p>
                  </div>
                  <div className="pt-1">
                    <Button
                      variant="secondary"
                      size="md"
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => setFilterRasa('all')}
                    >
                      Show All Tones
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      No scenes yet
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Start outlining your story structure by adding your first scene card or
                      writing a Scene Heading in the Screenplay Editor.
                    </p>
                  </div>
                  <div className="pt-1">
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={onAddSceneCard}
                    >
                      New Scene Card
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCards.map((block) => {
              if (block.elementType === 'section-act') {
                return (
                  <div
                    key={block.id}
                    className="col-span-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-500">
                        {block.text || 'ACT / STRUCTURAL MARKER'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      rightIcon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => onJumpToSceneInEditor(block.id)}
                    >
                      Jump to Script
                    </Button>
                  </div>
                );
              }

              const words = getSceneWordCount(block.id);
              const eighths = Math.max(1, Math.ceil(words / 32));
              const sceneIdx = sceneBlocks.findIndex((s) => s.id === block.id);
              const isFirstScene = sceneIdx <= 0;
              const isLastScene = sceneIdx === -1 || sceneIdx >= sceneBlocks.length - 1;
              const rasaAccent = block.rasa ? NAVARASA_ACCENT_BAR[block.rasa] : null;

              return (
                <Card
                  key={block.id}
                  interactive
                  className="relative overflow-hidden p-4 flex flex-col justify-between gap-3"
                >
                  {rasaAccent && (
                    <div
                      aria-hidden="true"
                      className={`absolute inset-x-0 top-0 h-1 ${rasaAccent}`}
                    />
                  )}

                  <div className={rasaAccent ? 'pt-0.5' : ''}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="amber" mono>
                          #{block.sceneNumber ?? '•'}
                        </Badge>
                        {block.locked && <Lock className="w-3 h-3 text-amber-500" />}
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          {eighths}/8 pg • {words}w
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <IconButton
                          size="xs"
                          disabled={isFirstScene}
                          className="disabled:opacity-30 disabled:pointer-events-none"
                          icon={<ArrowUp className="w-3.5 h-3.5" />}
                          onClick={() => onMoveScene(block.id, 'up')}
                          title={isFirstScene ? 'Already first scene' : 'Move Scene Earlier'}
                          aria-label="Move Scene Earlier"
                        />
                        <IconButton
                          size="xs"
                          disabled={isLastScene}
                          className="disabled:opacity-30 disabled:pointer-events-none"
                          icon={<ArrowDown className="w-3.5 h-3.5" />}
                          onClick={() => onMoveScene(block.id, 'down')}
                          title={isLastScene ? 'Already last scene' : 'Move Scene Later'}
                          aria-label="Move Scene Later"
                        />
                        <IconButton
                          size="xs"
                          variant="amber-soft"
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                          onClick={() => onJumpToSceneInEditor(block.id)}
                          title="Open Scene in Screenplay Editor"
                          aria-label="Open Scene in Screenplay Editor"
                        />
                      </div>
                    </div>

                    <h3 className="font-script font-bold text-xs uppercase tracking-wide text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
                      {block.text.trim() || 'INT. UNTITLED SCENE'}
                    </h3>
                  </div>

                  <Textarea
                    rows={3}
                    value={block.synopsis ?? ''}
                    onChange={(e) => onUpdateSceneSynopsis(block.id, e.target.value)}
                    placeholder="Write index card beat summary, conflict, or dramatic turn..."
                  />

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Tone:</span>
                    </div>

                    <Select<string>
                      ariaLabel="Scene Emotional Tone"
                      size="xs"
                      value={block.rasa ?? ''}
                      onChange={(val) =>
                        onUpdateSceneRasa(
                          block.id,
                          (val || undefined) as NavarasaTag | undefined
                        )
                      }
                      options={[
                        { value: '', label: 'Unassigned Tone' },
                        ...(Object.keys(NAVARASA_META) as NavarasaTag[]).map((rk) => ({
                          value: rk,
                          label: `${NAVARASA_META[rk].name} (${NAVARASA_META[rk].meaning})`,
                        })),
                      ]}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
