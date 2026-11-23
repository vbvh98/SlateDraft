import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clapperboard,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  MapPin,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';
import {
  CastCallEntry,
  CrewContact,
  IndicLanguage,
  ProductionState,
  ProductionTags,
  ScriptAnalyticsReport,
  ScriptBlock,
  ShootDay,
  ShotItem,
  TitlePageData,
} from '../types/screenplay';
import { formatPageEighths } from '../services/analyticsEngine';
import {
  autoScheduleShootDays,
  computeDayOutOfDays,
  EMPTY_PRODUCTION_TAGS,
  exportDoodCsv,
  exportShotListCsv,
  extractSceneBreakdowns,
} from '../services/productionEngine';
import { LANGUAGE_METADATA } from '../services/transliterationEngine';
import {
  Badge,
  Button,
  Card,
  StatCard,
  Tabs,
  WorkspaceHeader,
} from './ui';
import { StripboardView } from './production/StripboardView';
import { DoodView } from './production/DoodView';
import { ShotListView } from './production/ShotListView';
import { DepartmentBreakdownView } from './production/DepartmentBreakdownView';
import { CallSheetView } from './production/CallSheetView';

export type ProductionTab =
  | 'overview'
  | 'stripboard'
  | 'dood'
  | 'shot-list'
  | 'departments'
  | 'call-sheet';

interface ProductionReportsProps {
  blocks: ScriptBlock[];
  analytics: ScriptAnalyticsReport;
  language: IndicLanguage;
  titlePage: TitlePageData;
  productionState: ProductionState;
  onUpdateProductionState: (
    updater: (prev: ProductionState) => ProductionState
  ) => void;
  onUpdateSceneTags: (sceneId: string, tags: ProductionTags) => void;
  onJumpToSceneInEditor?: (sceneId: string) => void;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ProductionReports: React.FC<ProductionReportsProps> = ({
  blocks,
  analytics,
  language,
  titlePage,
  productionState,
  onUpdateProductionState,
  onUpdateSceneTags,
  onJumpToSceneInEditor,
}) => {
  const [activeTab, setActiveTab] = useState<ProductionTab>('overview');

  const scenes = useMemo(() => extractSceneBreakdowns(blocks), [blocks]);
  const activeScenes = useMemo(() => scenes.filter((s) => !s.omitted), [scenes]);

  // Keep shoot days pruned of any deleted scene IDs
  const validSceneIds = useMemo(
    () => new Set(activeScenes.map((s) => s.sceneId)),
    [activeScenes]
  );

  const sanitizedShootDays = useMemo(
    () =>
      productionState.shootDays.map((day) => ({
        ...day,
        sceneIds: day.sceneIds.filter((id) => validSceneIds.has(id)),
      })),
    [productionState.shootDays, validSceneIds]
  );

  const doodReport = useMemo(
    () => computeDayOutOfDays(activeScenes, sanitizedShootDays),
    [activeScenes, sanitizedShootDays]
  );

  const scheduledSceneCount = useMemo(() => {
    const set = new Set<string>();
    sanitizedShootDays.forEach((d) => d.sceneIds.forEach((id) => set.add(id)));
    return set.size;
  }, [sanitizedShootDays]);

  const unscheduledCount = Math.max(0, activeScenes.length - scheduledSceneCount);
  const nightScenesCount = activeScenes.filter((s) => s.timeOfDay === 'NIGHT').length;
  const missingSynopsisCount = activeScenes.filter((s) => !s.synopsis.trim()).length;

  // Stripboard actions
  const handleAutoSchedule = () => {
    const generated = autoScheduleShootDays(activeScenes);
    onUpdateProductionState((prev) => ({
      ...prev,
      shootDays: generated,
    }));
  };

  const handleAddShootDay = () => {
    onUpdateProductionState((prev) => {
      const nextNum =
        prev.shootDays.reduce((max, d) => Math.max(max, d.dayNumber), 0) + 1;
      const newDay: ShootDay = {
        id: `day-${Date.now()}-${nextNum}`,
        dayNumber: nextNum,
        label: `Day ${nextNum}`,
        shootDate: '',
        generalCall: '07:00',
        locationAddress: '',
        nearestHospital: '',
        sunriseSunset: '06:15 / 18:20',
        weatherNotes: '',
        safetyNotes: '',
        sceneIds: [],
      };
      return {
        ...prev,
        shootDays: [...prev.shootDays, newDay],
      };
    });
  };

  const handleDeleteShootDay = (dayId: string) => {
    onUpdateProductionState((prev) => {
      const filtered = prev.shootDays
        .filter((d) => d.id !== dayId)
        .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
      return {
        ...prev,
        shootDays: filtered,
      };
    });
  };

  const handleAssignSceneToDay = (sceneId: string, targetDayId: string | null) => {
    onUpdateProductionState((prev) => {
      const nextDays = prev.shootDays.map((day) => {
        const without = day.sceneIds.filter((id) => id !== sceneId);
        if (targetDayId && day.id === targetDayId) {
          return { ...day, sceneIds: [...without, sceneId] };
        }
        return { ...day, sceneIds: without };
      });
      return { ...prev, shootDays: nextDays };
    });
  };

  const handleMoveSceneInDay = (
    dayId: string,
    sceneId: string,
    direction: 'up' | 'down'
  ) => {
    onUpdateProductionState((prev) => ({
      ...prev,
      shootDays: prev.shootDays.map((day) => {
        if (day.id !== dayId) return day;
        const idx = day.sceneIds.indexOf(sceneId);
        if (idx === -1) return day;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= day.sceneIds.length) return day;
        const nextIds = [...day.sceneIds];
        [nextIds[idx], nextIds[swapIdx]] = [nextIds[swapIdx], nextIds[idx]];
        return { ...day, sceneIds: nextIds };
      }),
    }));
  };

  const handleUpdateShootDay = (dayId: string, patch: Partial<ShootDay>) => {
    onUpdateProductionState((prev) => ({
      ...prev,
      shootDays: prev.shootDays.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
    }));
  };

  const handleUpdateCastCall = (
    characterName: string,
    patch: Partial<CastCallEntry>
  ) => {
    onUpdateProductionState((prev) => {
      const existing = prev.castCalls[characterName] ?? {
        characterName,
        actorName: '',
        callTime: '07:00',
        hmwTime: '07:30',
        onSetTime: '08:15',
      };
      return {
        ...prev,
        castCalls: {
          ...prev.castCalls,
          [characterName]: { ...existing, ...patch },
        },
      };
    });
  };

  const handleUpdateCrewContacts = (crewContacts: CrewContact[]) => {
    onUpdateProductionState((prev) => ({
      ...prev,
      crewContacts,
    }));
  };

  // Shot List actions
  const handleAddShot = (sceneId: string) => {
    const sc = activeScenes.find((s) => s.sceneId === sceneId);
    const existingForScene = productionState.shots.filter((sh) => sh.sceneId === sceneId);
    const letter = String.fromCharCode(65 + (existingForScene.length % 26));
    const newShot: ShotItem = {
      id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      sceneId,
      shotNumber: `${sc?.sceneNumber ?? '1'}${letter}`,
      size: existingForScene.length === 0 ? 'WIDE' : 'MEDIUM',
      movement: 'STATIC',
      lens: existingForScene.length === 0 ? '24mm' : '50mm',
      description: '',
      setupMinutes: 25,
      lightingNotes: '',
      completed: false,
    };
    onUpdateProductionState((prev) => ({
      ...prev,
      shots: [...prev.shots, newShot],
    }));
  };

  const handleUpdateShot = (shotId: string, patch: Partial<ShotItem>) => {
    onUpdateProductionState((prev) => ({
      ...prev,
      shots: prev.shots.map((sh) => (sh.id === shotId ? { ...sh, ...patch } : sh)),
    }));
  };

  const handleDeleteShot = (shotId: string) => {
    onUpdateProductionState((prev) => ({
      ...prev,
      shots: prev.shots.filter((sh) => sh.id !== shotId),
    }));
  };

  // CSV Exports
  const handleExportMasterBreakdownCsv = () => {
    const header =
      'Scene #,Scene Heading,INT/EXT,D/N,Pages,Cast,Props,Costumes,VFX,Stunts,Extras,Vehicles,Songs\n';
    const rows = activeScenes
      .map((s) => {
        const t = s.productionTags ?? EMPTY_PRODUCTION_TAGS;
        return [
          s.sceneNumber,
          csvEscape(s.heading),
          s.intExt,
          s.timeOfDay,
          csvEscape(formatPageEighths(s.eighths)),
          csvEscape(s.cast.join('; ')),
          csvEscape((t.props ?? []).join('; ')),
          csvEscape((t.costumes ?? []).join('; ')),
          csvEscape((t.vfx ?? []).join('; ')),
          csvEscape((t.stunts ?? []).join('; ')),
          csvEscape((t.extras ?? []).join('; ')),
          csvEscape((t.vehicles ?? []).join('; ')),
          csvEscape((t.songs ?? []).join('; ')),
        ].join(',');
      })
      .join('\n');

    downloadCsvFile('SlateDraft-Master-Breakdown.csv', header + rows);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <WorkspaceHeader
        title="Production & Crew Command Suite"
        subtitle="1st AD Stripboard, Producer DOOD, Director/DOP Shot List, Department Packets, and Daily Call Sheets — live-synced to your screenplay."
        icon={<Clapperboard className="w-4 h-4" />}
        actions={
          <div className="flex items-center gap-2 no-print">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportMasterBreakdownCsv}
            >
              Master Breakdown (.CSV)
            </Button>
          </div>
        }
      />

      {/* Department / Role Navigation Bar */}
      <div className="px-6 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] overflow-x-auto shrink-0 no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Tabs<ProductionTab>
            activeId={activeTab}
            onChange={setActiveTab}
            items={[
              {
                id: 'overview',
                label: 'Overview',
                icon: <BarChart3 className="w-3.5 h-3.5" />,
              },
              {
                id: 'stripboard',
                label: `Stripboard (${sanitizedShootDays.length}d)`,
                icon: <Layers className="w-3.5 h-3.5" />,
              },
              {
                id: 'dood',
                label: 'Day-Out-of-Days',
                icon: <CalendarDays className="w-3.5 h-3.5" />,
              },
              {
                id: 'shot-list',
                label: `Shot List (${productionState.shots.length})`,
                icon: <Camera className="w-3.5 h-3.5" />,
              },
              {
                id: 'departments',
                label: 'Departments',
                icon: <Tag className="w-3.5 h-3.5" />,
              },
              {
                id: 'call-sheet',
                label: 'Call Sheet',
                icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
              },
            ]}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Top Metrics Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Shooting Page Count"
                  value={analytics.formattedEighths}
                  subtext={`${analytics.totalScenes} Scenes • ${sanitizedShootDays.length} Shoot Days`}
                  icon={<BarChart3 className="w-3.5 h-3.5" />}
                />

                <StatCard
                  label="Calibrated Screen Time"
                  value={`${analytics.estimatedRuntimeMinutes} min`}
                  highlight
                  subtext={`${LANGUAGE_METADATA[language].scriptName} factor: ${analytics.indicCalibrationFactor}x (Latin: ${analytics.latinStandardMinutes}m)`}
                  icon={<Clock className="w-3.5 h-3.5" />}
                />

                <StatCard
                  label="Dialogue vs Action"
                  value={`${analytics.dialoguePercentage}% / ${analytics.actionPercentage}%`}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  <div className="w-full h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden mt-2 flex">
                    <div
                      style={{ width: `${analytics.dialoguePercentage}%` }}
                      className="bg-amber-500 h-full"
                    />
                    <div
                      style={{ width: `${analytics.actionPercentage}%` }}
                      className="bg-emerald-500 h-full"
                    />
                  </div>
                </StatCard>

                <StatCard
                  label="Cast & Locations"
                  value={`${analytics.characters.length} Cast / ${analytics.locations.length} Locs`}
                  subtext={`${nightScenesCount} Night Scenes • ${analytics.songCount} Music Cues`}
                  icon={<MapPin className="w-3.5 h-3.5" />}
                />
              </div>

              {/* Production Readiness & Continuity Flags */}
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Pre-Production Readiness Checks
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {unscheduledCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('stripboard')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent-border)] hover:brightness-110 transition"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {unscheduledCount} unscheduled scene{unscheduledCount === 1 ? '' : 's'}
                      </button>
                    ) : (
                      <Badge variant="emerald">All scenes scheduled</Badge>
                    )}

                    {doodReport.totalHoldDays > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('dood')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[var(--danger-soft)] text-[var(--danger-text)] border border-[var(--danger-border)] hover:brightness-110 transition"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {doodReport.totalHoldDays} paid actor Hold day
                        {doodReport.totalHoldDays === 1 ? '' : 's'}
                      </button>
                    )}

                    {missingSynopsisCount > 0 && (
                      <Badge variant="stone">
                        {missingSynopsisCount} scene{missingSynopsisCount === 1 ? '' : 's'} missing
                        synopsis
                      </Badge>
                    )}

                    <Badge variant="sky" mono>
                      {productionState.shots.length} camera setups planned
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Two-Column Reports: Location Rollup & Cast Speaking Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[var(--accent)]" />
                    <span>Location Breakdown &amp; Day/Night Schedule</span>
                  </h3>
                  {analytics.locations.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-4">
                      No scene locations detected yet. Add Scene Headings (e.g. INT. OFFICE - DAY)
                      in the Screenplay Editor to generate the location schedule.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                            <th className="py-2">Location</th>
                            <th className="py-2">Type</th>
                            <th className="py-2">Scenes</th>
                            <th className="py-2">Day / Night</th>
                            <th className="py-2 text-right">Length</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {analytics.locations.map((loc) => (
                            <tr key={loc.location}>
                              <td className="py-2 font-mono font-medium text-[var(--text-primary)]">
                                {loc.location}
                              </td>
                              <td className="py-2">
                                <Badge variant="stone" mono>
                                  {loc.intExt}
                                </Badge>
                              </td>
                              <td className="py-2 font-mono text-[var(--text-secondary)]">
                                {loc.sceneCount}
                              </td>
                              <td className="py-2 font-mono text-[var(--text-muted)]">
                                {loc.dayScenes}D / {loc.nightScenes}N
                              </td>
                              <td className="py-2 font-mono text-right text-[var(--accent-text)]">
                                {formatPageEighths(loc.totalEighths)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-[var(--accent)]" />
                    <span>Cast Dialogue &amp; Screen Presence Report</span>
                  </h3>
                  {analytics.characters.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-4">
                      No character dialogue blocks in script yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                            <th className="py-2">Character</th>
                            <th className="py-2">Speeches</th>
                            <th className="py-2">Words</th>
                            <th className="py-2">Scenes</th>
                            <th className="py-2 text-right">Est. Speak Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {analytics.characters.map((ch) => (
                            <tr key={ch.name}>
                              <td className="py-2 font-mono font-semibold text-[var(--accent-text)]">
                                {ch.name}
                              </td>
                              <td className="py-2 font-mono text-[var(--text-secondary)]">
                                {ch.dialogueBlocks}
                              </td>
                              <td className="py-2 font-mono text-[var(--text-secondary)]">
                                {ch.wordCount}
                              </td>
                              <td className="py-2 font-mono text-[var(--text-secondary)]">
                                {ch.sceneAppearances}
                              </td>
                              <td className="py-2 font-mono text-right text-[var(--text-primary)]">
                                {ch.estimatedSpeakingSeconds}s
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}

          {activeTab === 'stripboard' && (
            <StripboardView
              scenes={scenes}
              shootDays={sanitizedShootDays}
              onAutoSchedule={handleAutoSchedule}
              onAddShootDay={handleAddShootDay}
              onDeleteShootDay={handleDeleteShootDay}
              onAssignSceneToDay={handleAssignSceneToDay}
              onMoveSceneInDay={handleMoveSceneInDay}
              onJumpToScene={onJumpToSceneInEditor}
            />
          )}

          {activeTab === 'dood' && (
            <DoodView
              doodReport={doodReport}
              shootDays={sanitizedShootDays}
              onExportCsv={() =>
                downloadCsvFile(
                  'SlateDraft-Day-Out-Of-Days.csv',
                  exportDoodCsv(doodReport, sanitizedShootDays)
                )
              }
              onJumpToStripboard={() => setActiveTab('stripboard')}
            />
          )}

          {activeTab === 'shot-list' && (
            <ShotListView
              scenes={scenes}
              shots={productionState.shots}
              onAddShot={handleAddShot}
              onUpdateShot={handleUpdateShot}
              onDeleteShot={handleDeleteShot}
              onExportCsv={() =>
                downloadCsvFile(
                  'SlateDraft-Shot-List.csv',
                  exportShotListCsv(productionState.shots, activeScenes)
                )
              }
            />
          )}

          {activeTab === 'departments' && (
            <DepartmentBreakdownView
              scenes={scenes}
              shootDays={sanitizedShootDays}
              onUpdateSceneTags={onUpdateSceneTags}
              onExportFullCsv={handleExportMasterBreakdownCsv}
            />
          )}

          {activeTab === 'call-sheet' && (
            <CallSheetView
              titlePage={titlePage}
              scenes={scenes}
              shootDays={sanitizedShootDays}
              castCalls={productionState.castCalls}
              crewContacts={productionState.crewContacts}
              doodReport={doodReport}
              onUpdateShootDay={handleUpdateShootDay}
              onUpdateCastCall={handleUpdateCastCall}
              onUpdateCrewContacts={handleUpdateCrewContacts}
              onJumpToStripboard={() => setActiveTab('stripboard')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
