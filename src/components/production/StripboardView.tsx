import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Clock,
  GripVertical,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { ShootDay } from '../../types/screenplay';
import { formatPageEighths } from '../../services/analyticsEngine';
import { SceneBreakdown, StripColorKey } from '../../services/productionEngine';
import { Badge, Button, Card, IconButton, Select } from '../ui';

export interface StripboardViewProps {
  scenes: SceneBreakdown[];
  shootDays: ShootDay[];
  onAutoSchedule: () => void;
  onAddShootDay: () => void;
  onDeleteShootDay: (dayId: string) => void;
  onAssignSceneToDay: (sceneId: string, targetDayId: string | null) => void;
  onMoveSceneInDay: (dayId: string, sceneId: string, direction: 'up' | 'down') => void;
  onJumpToScene?: (sceneId: string) => void;
}

const STRIP_STYLES: Record<
  StripColorKey,
  { bar: string; pillBg: string; label: string }
> = {
  'int-day': {
    bar: 'bg-stone-200',
    pillBg: 'bg-stone-200/15 text-stone-200 border-stone-400/30',
    label: 'INT DAY',
  },
  'int-night': {
    bar: 'bg-emerald-500',
    pillBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    label: 'INT NIGHT',
  },
  'ext-day': {
    bar: 'bg-amber-400',
    pillBg: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
    label: 'EXT DAY',
  },
  'ext-night': {
    bar: 'bg-sky-500',
    pillBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    label: 'EXT NIGHT',
  },
};

export const StripboardView: React.FC<StripboardViewProps> = ({
  scenes,
  shootDays,
  onAutoSchedule,
  onAddShootDay,
  onDeleteShootDay,
  onAssignSceneToDay,
  onMoveSceneInDay,
  onJumpToScene,
}) => {
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const activeScenes = scenes.filter((s) => !s.omitted);
  const sceneMap = new Map(activeScenes.map((s) => [s.sceneId, s]));

  const scheduledSet = new Set<string>();
  shootDays.forEach((d) => d.sceneIds.forEach((id) => scheduledSet.add(id)));
  const unscheduledScenes = activeScenes.filter((s) => !scheduledSet.has(s.sceneId));

  const dayOptions = [
    { value: '', label: 'Unscheduled' },
    ...shootDays.map((d) => ({ value: d.id, label: `Day ${d.dayNumber}` })),
  ];

  const handleStripDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    sceneId: string
  ) => {
    e.dataTransfer.setData('text/plain', sceneId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSceneId(sceneId);
  };

  const handleStripDragEnd = () => {
    setDraggedSceneId(null);
    setDragOverTarget(null);
  };

  const handleContainerDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleContainerDragLeave = (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string
  ) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOverTarget((prev) => (prev === targetKey ? null : prev));
    }
  };

  const handleContainerDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetDayId: string | null
  ) => {
    e.preventDefault();
    const sceneId = e.dataTransfer.getData('text/plain') || draggedSceneId;
    setDragOverTarget(null);
    setDraggedSceneId(null);
    if (sceneId) {
      onAssignSceneToDay(sceneId, targetDayId);
    }
  };

  const renderStrip = (
    scene: SceneBreakdown,
    dayId: string | null,
    idxInDay: number,
    totalInDay: number
  ) => {
    const style = STRIP_STYLES[scene.stripColor];
    const isDragging = draggedSceneId === scene.sceneId;
    return (
      <div
        key={scene.sceneId}
        draggable
        onDragStart={(e) => handleStripDragStart(e, scene.sceneId)}
        onDragEnd={handleStripDragEnd}
        className={`group relative flex flex-wrap md:flex-nowrap items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-grab active:cursor-grabbing ${
          isDragging ? 'opacity-45 scale-[0.99] ring-1 ring-[var(--accent)]' : ''
        }`}
      >
        {/* Drag Handle */}
        <GripVertical
          className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-60 group-hover:opacity-100 shrink-0 -mr-1.5"
          aria-hidden="true"
        />

        {/* Industry-standard Stripboard Color Spine */}
        <div
          className={`w-1.5 self-stretch rounded-full shrink-0 ${style.bar}`}
          aria-hidden="true"
        />

        {/* Scene # & Strip Type */}
        <div className="w-16 shrink-0">
          <div className="font-mono text-xs font-bold text-[var(--text-primary)] tabular-nums">
            Sc #{scene.sceneNumber}
          </div>
          <div className="text-[9px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
            {style.label}
          </div>
        </div>

        {/* Heading, Synopsis & Cast */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJumpToScene?.(scene.sceneId)}
              className="text-left font-mono text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors truncate"
              title="Open scene in Screenplay Editor"
            >
              {scene.heading}
            </button>
          </div>
          {scene.synopsis && (
            <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
              {scene.synopsis}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {scene.cast.length > 0 ? (
              scene.cast.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-secondary)]"
                >
                  {c}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-[var(--text-muted)] italic">No speaking cast</span>
            )}
          </div>
        </div>

        {/* Metrics: 1/8ths + Est. Hours */}
        <div className="flex items-center gap-4 shrink-0 text-right font-mono tabular-nums">
          <div>
            <div className="text-xs font-semibold text-[var(--accent-text)]">
              {formatPageEighths(scene.eighths)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">~{scene.estimatedHours}h</div>
          </div>
        </div>

        {/* Day Assignment & Reorder Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {dayId && (
            <div className="flex items-center gap-0.5">
              <IconButton
                size="xs"
                variant="ghost"
                aria-label={`Move Scene #${scene.sceneNumber} earlier`}
                disabled={idxInDay === 0}
                onClick={() => onMoveSceneInDay(dayId, scene.sceneId, 'up')}
                icon={<ArrowUp className="w-3.5 h-3.5" />}
              />
              <IconButton
                size="xs"
                variant="ghost"
                aria-label={`Move Scene #${scene.sceneNumber} later`}
                disabled={idxInDay >= totalInDay - 1}
                onClick={() => onMoveSceneInDay(dayId, scene.sceneId, 'down')}
                icon={<ArrowDown className="w-3.5 h-3.5" />}
              />
            </div>
          )}

          <Select
            ariaLabel={`Assign Scene #${scene.sceneNumber} to Shoot Day`}
            value={dayId ?? ''}
            onChange={(val) => onAssignSceneToDay(scene.sceneId, val || null)}
            options={dayOptions}
            className="text-xs py-1"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Stripboard Action Bar + Industry Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              1st AD Production Stripboard
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Group scenes by location and lighting to cut company moves and turnaround costs.
            </p>
          </div>
          <div className="hidden xl:flex items-center gap-3 pl-4 border-l border-[var(--border-subtle)]">
            {(['int-day', 'int-night', 'ext-day', 'ext-night'] as StripColorKey[]).map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-[var(--text-secondary)]"
              >
                <span className={`w-2.5 h-2.5 rounded-sm ${STRIP_STYLES[key].bar}`} />
                {STRIP_STYLES[key].label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={onAddShootDay}
          >
            Add Shoot Day
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={onAutoSchedule}
            disabled={activeScenes.length === 0}
          >
            Auto-Schedule by Location
          </Button>
        </div>
      </div>

      {/* Scheduled Shoot Days */}
      {shootDays.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarDays className="w-8 h-8 text-[var(--accent)] mx-auto mb-3 opacity-80" />
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            No Shoot Days Scheduled Yet
          </h4>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1 mb-4">
            Run Auto-Schedule to cluster your {activeScenes.length} script scenes by location and
            Day/Night, or add shoot days manually to build your stripboard.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={onAutoSchedule}
              disabled={activeScenes.length === 0}
            >
              Auto-Schedule {activeScenes.length} Scenes
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={onAddShootDay}
            >
              Create Blank Day 1
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {shootDays.map((day) => {
            const dayScenes = day.sceneIds
              .map((id) => sceneMap.get(id))
              .filter((s): s is SceneBreakdown => Boolean(s));
            const totalEighths = dayScenes.reduce((sum, s) => sum + s.eighths, 0);
            const totalHours = Number(
              dayScenes.reduce((sum, s) => sum + s.estimatedHours, 0).toFixed(1)
            );
            const uniqueLocs = Array.from(new Set(dayScenes.map((s) => s.location)));
            const uniqueCast = Array.from(new Set(dayScenes.flatMap((s) => s.cast)));
            const isOverloaded = totalEighths > 44 || totalHours > 12;
            const isDropTarget = dragOverTarget === day.id;

            return (
              <div
                key={day.id}
                onDragOver={(e) => handleContainerDragOver(e, day.id)}
                onDragLeave={(e) => handleContainerDragLeave(e, day.id)}
                onDrop={(e) => handleContainerDrop(e, day.id)}
                className={`rounded-xl transition-all ${
                  isDropTarget
                    ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-[var(--bg-app)]'
                    : ''
                }`}
              >
                <Card className="overflow-hidden">
                  {/* Day Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-surface-2)] border-b border-[var(--border-subtle)]">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-md bg-[var(--accent)] text-[var(--accent-on)] font-mono text-xs font-bold">
                        DAY {day.dayNumber}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                        {uniqueLocs.length > 0 ? uniqueLocs.join(' → ') : 'No scenes assigned'}
                      </span>
                      {uniqueLocs.length > 1 && (
                        <Badge variant="orange">{uniqueLocs.length - 1} Company Move(s)</Badge>
                      )}
                      {isOverloaded && <Badge variant="red">Heavy Shoot Day</Badge>}
                      {isDropTarget && <Badge variant="amber">Drop to Assign</Badge>}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                      <span className="text-[var(--text-secondary)] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {uniqueCast.length} Cast
                      </span>
                      <span className="text-[var(--text-secondary)] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />~{totalHours}h
                      </span>
                      <span className="font-semibold text-[var(--accent-text)]">
                        {dayScenes.length > 0 ? formatPageEighths(totalEighths) : '0 pgs'}
                      </span>
                      <IconButton
                        size="xs"
                        variant="danger"
                        aria-label={`Delete Day ${day.dayNumber}`}
                        onClick={() => onDeleteShootDay(day.id)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    </div>
                  </div>

                  {/* Strips inside this Day */}
                  <div className="p-3 space-y-2 bg-[var(--bg-app)]/40">
                    {dayScenes.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] text-center py-4">
                        Drag scenes here or assign them from the Unscheduled tray below to populate
                        Day {day.dayNumber}.
                      </p>
                    ) : (
                      dayScenes.map((sc, idx) => renderStrip(sc, day.id, idx, dayScenes.length))
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Unscheduled Strips Tray */}
      {(unscheduledScenes.length > 0 || draggedSceneId !== null) && (
        <div
          onDragOver={(e) => handleContainerDragOver(e, '__unscheduled__')}
          onDragLeave={(e) => handleContainerDragLeave(e, '__unscheduled__')}
          onDrop={(e) => handleContainerDrop(e, null)}
          className={`rounded-xl transition-all ${
            dragOverTarget === '__unscheduled__'
              ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-[var(--bg-app)]'
              : ''
          }`}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Unscheduled Scenes (Boneyard)
                </h4>
                <Badge variant="stone" mono>
                  {unscheduledScenes.length}
                </Badge>
                {dragOverTarget === '__unscheduled__' && (
                  <Badge variant="amber">Drop to Unschedule</Badge>
                )}
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                Drag a strip onto any Shoot Day or use the day selector to schedule it.
              </span>
            </div>
            {unscheduledScenes.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-3">
                Drop a scene strip here to move it back to Unscheduled.
              </p>
            ) : (
              <div className="space-y-2">
                {unscheduledScenes.map((sc, idx) =>
                  renderStrip(sc, null, idx, unscheduledScenes.length)
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
