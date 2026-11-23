import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import { CameraMovement, ShotItem, ShotSize } from '../../types/screenplay';
import { SceneBreakdown } from '../../services/productionEngine';
import { Badge, Button, Card, IconButton, Input, Select } from '../ui';

export interface ShotListViewProps {
  scenes: SceneBreakdown[];
  shots: ShotItem[];
  onAddShot: (sceneId: string) => void;
  onUpdateShot: (shotId: string, patch: Partial<ShotItem>) => void;
  onDeleteShot: (shotId: string) => void;
  onExportCsv: () => void;
}

const SHOT_SIZES: ShotSize[] = [
  'WIDE',
  'FULL',
  'MEDIUM',
  'CLOSE-UP',
  'ECU',
  'OTS',
  'TWO-SHOT',
  'INSERT',
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  'STATIC',
  'DOLLY',
  'STEADICAM',
  'HANDHELD',
  'PAN / TILT',
  'CRANE',
  'DRONE',
];

const LENS_PRESETS = ['18mm', '24mm', '35mm', '50mm', '85mm', '100mm Macro', 'Anamorphic 40mm'];

export const ShotListView: React.FC<ShotListViewProps> = ({
  scenes,
  shots,
  onAddShot,
  onUpdateShot,
  onDeleteShot,
  onExportCsv,
}) => {
  const activeScenes = scenes.filter((s) => !s.omitted);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    activeScenes[0]?.sceneId ?? ''
  );

  const currentScene =
    activeScenes.find((s) => s.sceneId === selectedSceneId) ?? activeScenes[0] ?? null;

  const sceneShots = currentScene
    ? shots.filter((sh) => sh.sceneId === currentScene.sceneId)
    : [];

  const completedCount = sceneShots.filter((s) => s.completed).length;
  const totalSetupMins = sceneShots.reduce((sum, s) => sum + (s.setupMinutes || 0), 0);
  const totalShotsAllScenes = shots.length;
  const totalCompletedAllScenes = shots.filter((s) => s.completed).length;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Director &amp; DOP Shot List
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Plan camera coverage, lenses, lighting setups, and check off completed setups on set.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="stone" mono>
            {totalCompletedAllScenes}/{totalShotsAllScenes} Total Shots Covered
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={onExportCsv}
            disabled={shots.length === 0}
          >
            Export Shot List (.CSV)
          </Button>
        </div>
      </div>

      {!currentScene ? (
        <Card className="p-8 text-center">
          <Camera className="w-8 h-8 text-[var(--accent)] mx-auto mb-3 opacity-80" />
          <p className="text-xs text-[var(--text-muted)]">
            Add a Scene Heading in the Screenplay Editor to start building your Shot List.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Scene Selector + Coverage Meter */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-surface-2)] border-b border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                ariaLabel="Select Scene for Shot List"
                value={currentScene.sceneId}
                onChange={setSelectedSceneId}
                options={activeScenes.map((s) => {
                  const count = shots.filter((sh) => sh.sceneId === s.sceneId).length;
                  return {
                    value: s.sceneId,
                    label: `Sc #${s.sceneNumber} — ${s.heading} (${count} shots)`,
                  };
                })}
              />

              <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-secondary)]">
                <span>
                  {completedCount}/{sceneShots.length} Shot
                </span>
                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                  <Clock className="w-3.5 h-3.5" />
                  {totalSetupMins >= 60
                    ? `${Math.floor(totalSetupMins / 60)}h ${totalSetupMins % 60}m`
                    : `${totalSetupMins}m`}{' '}
                  est. setups
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => onAddShot(currentScene.sceneId)}
            >
              Add Shot Setup
            </Button>
          </div>

          {/* Scene Coverage Progress Bar */}
          {sceneShots.length > 0 && (
            <div className="h-1 w-full bg-[var(--bg-surface-2)]">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{
                  width: `${Math.round((completedCount / sceneShots.length) * 100)}%`,
                }}
              />
            </div>
          )}

          {/* Shot Rows */}
          <div className="p-4 space-y-2.5">
            {sceneShots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  No camera setups planned for Scene #{currentScene.sceneNumber} yet.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => onAddShot(currentScene.sceneId)}
                >
                  Add First Shot (Setup {currentScene.sceneNumber}A)
                </Button>
              </div>
            ) : (
              sceneShots.map((shot) => (
                <div
                  key={shot.id}
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center p-3 rounded-lg border transition-colors ${
                    shot.completed
                      ? 'bg-emerald-500/5 border-emerald-500/25 opacity-80'
                      : 'bg-[var(--bg-surface-2)]/60 border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {/* Check + Shot Number */}
                  <div className="lg:col-span-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateShot(shot.id, { completed: !shot.completed })
                      }
                      className="text-[var(--text-muted)] hover:text-emerald-400 transition-colors shrink-0"
                      aria-label={
                        shot.completed
                          ? `Mark shot ${shot.shotNumber} incomplete`
                          : `Mark shot ${shot.shotNumber} completed`
                      }
                    >
                      {shot.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <Input
                      value={shot.shotNumber}
                      onChange={(e) =>
                        onUpdateShot(shot.id, { shotNumber: e.target.value })
                      }
                      aria-label="Shot Number"
                      className="font-mono font-bold text-xs py-1 px-2 w-20"
                    />
                  </div>

                  {/* Size, Movement, Lens */}
                  <div className="lg:col-span-4 grid grid-cols-3 gap-1.5">
                    <Select<ShotSize>
                      ariaLabel="Shot Size"
                      value={shot.size}
                      onChange={(val) => onUpdateShot(shot.id, { size: val })}
                      options={SHOT_SIZES.map((s) => ({ value: s, label: s }))}
                      className="text-[11px] py-1"
                    />
                    <Select<CameraMovement>
                      ariaLabel="Camera Movement"
                      value={shot.movement}
                      onChange={(val) => onUpdateShot(shot.id, { movement: val })}
                      options={CAMERA_MOVEMENTS.map((m) => ({ value: m, label: m }))}
                      className="text-[11px] py-1"
                    />
                    <Select
                      ariaLabel="Lens"
                      value={shot.lens}
                      onChange={(val) => onUpdateShot(shot.id, { lens: val })}
                      options={LENS_PRESETS.map((l) => ({ value: l, label: l }))}
                      className="text-[11px] py-1"
                    />
                  </div>

                  {/* Framing / Action Description */}
                  <div className="lg:col-span-3">
                    <Input
                      value={shot.description}
                      onChange={(e) =>
                        onUpdateShot(shot.id, { description: e.target.value })
                      }
                      placeholder="Framing / blocking note..."
                      aria-label="Shot Description"
                      className="text-xs py-1"
                    />
                  </div>

                  {/* Lighting + Setup mins + Delete */}
                  <div className="lg:col-span-3 flex items-center gap-1.5">
                    <Input
                      value={shot.lightingNotes}
                      onChange={(e) =>
                        onUpdateShot(shot.id, { lightingNotes: e.target.value })
                      }
                      placeholder="Lighting / grip..."
                      aria-label="Lighting Notes"
                      containerClassName="flex-1"
                      className="text-xs py-1"
                    />
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      step={5}
                      value={String(shot.setupMinutes)}
                      onChange={(e) =>
                        onUpdateShot(shot.id, {
                          setupMinutes: Math.max(5, Number(e.target.value) || 15),
                        })
                      }
                      aria-label="Setup Minutes"
                      className="text-xs py-1 px-1.5 w-14 font-mono text-center"
                      title="Estimated setup time (minutes)"
                    />
                    <IconButton
                      size="xs"
                      variant="danger"
                      aria-label={`Delete shot ${shot.shotNumber}`}
                      onClick={() => onDeleteShot(shot.id)}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
