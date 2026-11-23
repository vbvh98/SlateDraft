import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  Filter,
  Plus,
  Sparkles,
  Tag,
} from 'lucide-react';
import { ProductionTags, ShootDay } from '../../types/screenplay';
import {
  buildDepartmentRollup,
  detectElementsInScene,
  EMPTY_PRODUCTION_TAGS,
  exportDepartmentCsv,
  SceneBreakdown,
} from '../../services/productionEngine';
import { Badge, BadgeVariant, Button, Card, Input, Select } from '../ui';

export interface DepartmentBreakdownViewProps {
  scenes: SceneBreakdown[];
  shootDays: ShootDay[];
  onUpdateSceneTags: (sceneId: string, tags: ProductionTags) => void;
  onExportFullCsv: () => void;
}

export const DEPARTMENT_CATEGORIES: Array<{
  key: keyof ProductionTags;
  label: string;
  teamOwner: string;
  variant: BadgeVariant;
}> = [
  { key: 'props', label: 'Props & Set Dressing', teamOwner: 'Art Dept', variant: 'amber' },
  { key: 'costumes', label: 'Wardrobe / Costumes', teamOwner: 'Costume Designer', variant: 'rose' },
  { key: 'vfx', label: 'VFX / SFX', teamOwner: 'VFX Supervisor', variant: 'purple' },
  { key: 'stunts', label: 'Action / Stunts', teamOwner: 'Stunt Coordinator', variant: 'red' },
  { key: 'extras', label: 'Crowd / Junior Artists', teamOwner: '2nd AD / Casting', variant: 'emerald' },
  { key: 'vehicles', label: 'Vehicles / Animals', teamOwner: 'Transport / Wrangler', variant: 'sky' },
  { key: 'songs', label: 'Music / Playback Cues', teamOwner: 'Sound / Music Dept', variant: 'orange' },
];

export const DepartmentBreakdownView: React.FC<DepartmentBreakdownViewProps> = ({
  scenes,
  shootDays,
  onUpdateSceneTags,
  onExportFullCsv,
}) => {
  const activeScenes = scenes.filter((s) => !s.omitted);
  const [mode, setMode] = useState<'scene-tagger' | 'dept-packet'>('scene-tagger');
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    activeScenes[0]?.sceneId ?? ''
  );
  const [selectedCategory, setSelectedCategory] = useState<keyof ProductionTags>('props');
  const [packetCategory, setPacketCategory] = useState<keyof ProductionTags>('props');
  const [tagInput, setTagInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const activeScene =
    activeScenes.find((s) => s.sceneId === selectedSceneId) ?? activeScenes[0] ?? null;

  const activeTags: ProductionTags = activeScene?.productionTags ?? EMPTY_PRODUCTION_TAGS;

  const departmentRollup = useMemo(
    () => buildDepartmentRollup(activeScenes, shootDays, packetCategory),
    [activeScenes, shootDays, packetCategory]
  );

  const handleAddTag = () => {
    if (!activeScene || !tagInput.trim()) return;
    const val = tagInput.trim();
    const existingList = activeTags[selectedCategory] ?? [];
    if (existingList.some((item) => item.toLowerCase() === val.toLowerCase())) {
      const catLabel =
        DEPARTMENT_CATEGORIES.find((c) => c.key === selectedCategory)?.label ??
        selectedCategory;
      setNotice(`"${val}" is already tagged under ${catLabel} for this scene.`);
      return;
    }

    onUpdateSceneTags(activeScene.sceneId, {
      ...EMPTY_PRODUCTION_TAGS,
      ...activeTags,
      [selectedCategory]: [...existingList, val],
    });
    setTagInput('');
    setNotice(null);
  };

  const handleRemoveTag = (cat: keyof ProductionTags, item: string) => {
    if (!activeScene) return;
    onUpdateSceneTags(activeScene.sceneId, {
      ...EMPTY_PRODUCTION_TAGS,
      ...activeTags,
      [cat]: (activeTags[cat] ?? []).filter((x) => x !== item),
    });
    setNotice(null);
  };

  const handleAutoDetectScene = () => {
    if (!activeScene) return;
    const detected = detectElementsInScene(
      `${activeScene.heading}\n${activeScene.rawBodyText}`
    );
    const merged: ProductionTags = { ...EMPTY_PRODUCTION_TAGS, ...activeTags };
    let addedCount = 0;

    (Object.keys(detected) as Array<keyof ProductionTags>).forEach((cat) => {
      const currentList = merged[cat] ?? [];
      const toAdd = detected[cat].filter(
        (item) => !currentList.some((c) => c.toLowerCase() === item.toLowerCase())
      );
      if (toAdd.length > 0) {
        merged[cat] = [...currentList, ...toAdd];
        addedCount += toAdd.length;
      }
    });

    if (addedCount > 0) {
      onUpdateSceneTags(activeScene.sceneId, merged);
      setNotice(`Auto-detected and tagged ${addedCount} element${addedCount === 1 ? '' : 's'} from Scene #${activeScene.sceneNumber}.`);
    } else {
      setNotice(`No new untagged department cues detected in Scene #${activeScene.sceneNumber}.`);
    }
  };

  const handleExportDepartmentPacket = () => {
    const meta = DEPARTMENT_CATEGORIES.find((c) => c.key === packetCategory);
    const csv = exportDepartmentCsv(meta?.label ?? packetCategory, departmentRollup);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SlateDraft-${packetCategory}-Packet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Mode Switcher + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('scene-tagger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              mode === 'scene-tagger'
                ? 'bg-[var(--accent)] text-[var(--accent-on)] font-semibold'
                : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Scene Element Tagger
          </button>
          <button
            type="button"
            onClick={() => setMode('dept-packet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              mode === 'dept-packet'
                ? 'bg-[var(--accent)] text-[var(--accent-on)] font-semibold'
                : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Department Packets (HOD View)
          </button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={onExportFullCsv}
        >
          Export Master Breakdown (.CSV)
        </Button>
      </div>

      {mode === 'scene-tagger' ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Scene Breakdown Element Tagger
              </h3>
            </div>

            {activeScenes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  ariaLabel="Active Scene for Breakdown"
                  value={activeScene?.sceneId ?? ''}
                  onChange={(val) => {
                    setSelectedSceneId(val);
                    setNotice(null);
                  }}
                  options={activeScenes.map((s) => ({
                    value: s.sceneId,
                    label: `Sc #${s.sceneNumber} — ${s.heading}`,
                  }))}
                />
                <Button
                  variant="amber-soft"
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={handleAutoDetectScene}
                >
                  Auto-Detect Cues
                </Button>
              </div>
            )}
          </div>

          {activeScene ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select<keyof ProductionTags>
                  ariaLabel="Breakdown Department Category"
                  value={selectedCategory}
                  onChange={(val) => {
                    setSelectedCategory(val);
                    setNotice(null);
                  }}
                  options={DEPARTMENT_CATEGORIES.map((cat) => ({
                    value: cat.key,
                    label: `${cat.label} (${cat.teamOwner})`,
                  }))}
                />

                <Input
                  containerClassName="flex-1 min-w-[220px]"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    if (notice) setNotice(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                  }}
                  placeholder={`Add ${selectedCategory} cue for Scene #${activeScene.sceneNumber}...`}
                />

                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddTag}
                >
                  Tag Element
                </Button>
              </div>

              {notice && (
                <div
                  role="status"
                  className="flex items-center gap-2 text-xs text-[var(--accent-text)] bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-lg px-3 py-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {DEPARTMENT_CATEGORIES.map((cat) => {
                  const items = activeTags[cat.key] ?? [];
                  return (
                    <div
                      key={cat.key}
                      className="p-3 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center justify-between">
                        <span>{cat.label}</span>
                        <span className="font-mono text-[var(--text-muted)]">{items.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.length === 0 ? (
                          <span className="text-[11px] text-[var(--text-muted)] italic">
                            None tagged
                          </span>
                        ) : (
                          items.map((item) => (
                            <Badge
                              key={item}
                              variant={cat.variant}
                              onRemove={() => handleRemoveTag(cat.key, item)}
                            >
                              {item}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Add a Scene Heading to begin tagging production elements.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Department-Specific HOD Packet
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Filter all tagged requirements for a single Head of Department with scene numbers
                and shoot days.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Select<keyof ProductionTags>
                ariaLabel="Filter Department Packet"
                value={packetCategory}
                onChange={setPacketCategory}
                options={DEPARTMENT_CATEGORIES.map((cat) => ({
                  value: cat.key,
                  label: `${cat.teamOwner} — ${cat.label}`,
                }))}
              />
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportDepartmentPacket}
                disabled={departmentRollup.length === 0}
              >
                Export Packet (.CSV)
              </Button>
            </div>
          </div>

          {departmentRollup.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">
              No elements tagged under this department yet. Switch to the Scene Element Tagger or
              click Auto-Detect Cues to populate requirements.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                    <th className="py-2 pr-4">Element / Requirement</th>
                    <th className="py-2 px-3 text-center">Count</th>
                    <th className="py-2 px-3">Scenes Required</th>
                    <th className="py-2 pl-3 text-right">Scheduled Shoot Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {departmentRollup.map((row) => (
                    <tr key={row.item} className="hover:bg-[var(--bg-surface-2)]/50">
                      <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">
                        {row.item}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[var(--text-secondary)]">
                        {row.occurrences}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {row.sceneNumbers.map((sn) => (
                            <Badge key={sn} variant="stone" mono>
                              #{sn}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        {row.shootDayNumbers.length > 0 ? (
                          <div className="flex flex-wrap justify-end gap-1">
                            {row.shootDayNumbers.map((d) => (
                              <Badge key={d} variant="amber" mono>
                                Day {d}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)] italic">
                            Unscheduled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
