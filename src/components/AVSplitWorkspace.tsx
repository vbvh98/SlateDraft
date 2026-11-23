import React from 'react';
import { Clock, Film, Plus, Trash2, Volume2 } from 'lucide-react';
import { AVRow, StudioTheme } from '../types/screenplay';
import {
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  Slider,
  Textarea,
  WorkspaceHeader,
} from './ui';

interface AVSplitWorkspaceProps {
  rows: AVRow[];
  onUpdateRow: (id: string, patch: Partial<AVRow>) => void;
  onAddRowAfter: (afterId?: string) => void;
  onDeleteRow: (id: string) => void;
  theme: StudioTheme;
}

const SHOT_TYPES: AVRow['shotType'][] = [
  'WIDE',
  'MID',
  'CLOSE-UP',
  'DRONE',
  'TRACKING',
  'INSERT',
  'MONTAGE',
  'SUPER',
];

const AUDIO_TYPES: AVRow['audioType'][] = ['VO', 'SYNC', 'SFX', 'MUSIC'];

function formatTimecode(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AVSplitWorkspace: React.FC<AVSplitWorkspaceProps> = ({
  rows,
  onUpdateRow,
  onAddRowAfter,
  onDeleteRow,
  theme,
}) => {
  const totalSeconds = rows.reduce((acc, r) => acc + (Number(r.durationSeconds) || 0), 0);
  const isLightTheme = theme === 'sahitya';

  let runningStart = 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <WorkspaceHeader
        title="Dual-Column Audio-Visual (AV) Workspace"
        subtitle="Synchronized Visual & Audio rows for TVCs, Commercials, Promos, and Documentaries."
        icon={<Film className="w-4 h-4" />}
        actions={
          <>
            <Badge variant="amber" mono className="px-3 py-1 text-xs">
              <Clock className="w-3.5 h-3.5 inline mr-1.5" />
              Total Runtime: {formatTimecode(totalSeconds)} ({totalSeconds}s)
            </Badge>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => onAddRowAfter()}
            >
              Add AV Cue Row
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div
          className={`max-w-5xl mx-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] overflow-hidden shadow-sm`}
        >
          <div className="grid grid-cols-12 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            <div className="col-span-2 px-4 py-3 border-r border-[var(--border-subtle)]">
              Cue & Timecode
            </div>
            <div className="col-span-5 px-4 py-3 border-r border-[var(--border-subtle)] flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-amber-500" />
              <span>Visuals (Camera / Action / Super)</span>
            </div>
            <div className="col-span-5 px-4 py-3 flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Audio (VO / Sync Dialogue / SFX / Music)</span>
            </div>
          </div>

          {rows.map((row, index) => {
            const startSec = runningStart;
            const endSec = startSec + (Number(row.durationSeconds) || 0);
            runningStart = endSec;

            return (
              <div
                key={row.id}
                className={`grid grid-cols-12 border-b border-[var(--border-subtle)] last:border-b-0 group transition-colors ${
                  isLightTheme ? 'hover:bg-amber-500/[0.04]' : 'hover:bg-amber-500/[0.03]'
                }`}
              >
                <div className="col-span-2 p-3 border-r border-[var(--border-subtle)] flex flex-col justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="amber" mono>
                      #{index + 1}
                    </Badge>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {formatTimecode(startSec)}–{formatTimecode(endSec)}
                    </span>
                  </div>

                  <Slider
                    label="Duration"
                    value={row.durationSeconds}
                    min={1}
                    max={60}
                    step={1}
                    unit="s"
                    onChange={(val) => onUpdateRow(row.id, { durationSeconds: val })}
                  />

                  <div className="flex items-center justify-between pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="xs"
                      leftIcon={<Plus className="w-2.5 h-2.5" />}
                      onClick={() => onAddRowAfter(row.id)}
                    >
                      Row
                    </Button>
                    {rows.length > 1 && (
                      <IconButton
                        size="xs"
                        variant="danger"
                        icon={<Trash2 className="w-3 h-3" />}
                        onClick={() => onDeleteRow(row.id)}
                        title="Remove Row"
                        aria-label={`Remove AV Row ${index + 1}`}
                      />
                    )}
                  </div>
                </div>

                {/* Middle Column: VISUALS */}
                <div className="col-span-5 p-3 border-r border-[var(--border-subtle)] flex flex-col gap-2">
                  <Select<AVRow['shotType']>
                    ariaLabel="Shot Type"
                    size="xs"
                    value={row.shotType}
                    onChange={(val) => onUpdateRow(row.id, { shotType: val })}
                    options={SHOT_TYPES.map((st) => ({ value: st, label: st }))}
                  />
                  <Textarea
                    scriptFont
                    rows={3}
                    value={row.visualText}
                    onChange={(e) => onUpdateRow(row.id, { visualText: e.target.value })}
                    placeholder="Describe frame composition, camera motion, visual action, or on-screen super..."
                    className="!bg-transparent !border-transparent px-0 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>

                {/* Right Column: AUDIO */}
                <div className="col-span-5 p-3 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Select<AVRow['audioType']>
                      ariaLabel="Audio Type"
                      size="xs"
                      value={row.audioType}
                      onChange={(val) => onUpdateRow(row.id, { audioType: val })}
                      options={AUDIO_TYPES.map((at) => ({ value: at, label: at }))}
                    />
                    <Input
                      mono
                      containerClassName="col-span-2"
                      value={row.audioSpeaker}
                      onChange={(e) =>
                        onUpdateRow(row.id, { audioSpeaker: e.target.value.toUpperCase() })
                      }
                      placeholder="SPEAKER / CUE SOURCE"
                      className="py-0.5 uppercase"
                    />
                  </div>
                  <Textarea
                    scriptFont
                    rows={3}
                    value={row.audioText}
                    onChange={(e) => onUpdateRow(row.id, { audioText: e.target.value })}
                    placeholder="Spoken voiceover, sync dialogue, sound design cue, or music track notes..."
                    className="!bg-transparent !border-transparent px-0 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
