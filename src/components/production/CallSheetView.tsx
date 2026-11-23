import React, { useState } from 'react';
import {
  Check,
  ClipboardCopy,
  FileSpreadsheet,
  Phone,
  Plus,
  Printer,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  CastCallEntry,
  CrewContact,
  ProductionTags,
  ShootDay,
  TitlePageData,
} from '../../types/screenplay';
import { formatPageEighths } from '../../services/analyticsEngine';
import {
  DoodReport,
  formatCallSheetText,
  SceneBreakdown,
} from '../../services/productionEngine';
import { Badge, Button, Card, IconButton, Input, Select } from '../ui';
import { DEPARTMENT_CATEGORIES } from './DepartmentBreakdownView';

export const DEFAULT_CREW_CONTACTS: CrewContact[] = [
  { role: 'Director', name: '', phone: '' },
  { role: '1st AD', name: '', phone: '' },
  { role: 'DOP', name: '', phone: '' },
  { role: 'UPM', name: '', phone: '' },
  { role: 'Line Producer', name: '', phone: '' },
];

export interface CallSheetViewProps {
  titlePage: TitlePageData;
  scenes: SceneBreakdown[];
  shootDays: ShootDay[];
  castCalls: Record<string, CastCallEntry>;
  crewContacts?: CrewContact[];
  doodReport: DoodReport;
  onUpdateShootDay: (dayId: string, patch: Partial<ShootDay>) => void;
  onUpdateCastCall: (characterName: string, patch: Partial<CastCallEntry>) => void;
  onUpdateCrewContacts?: (contacts: CrewContact[]) => void;
  onJumpToStripboard: () => void;
}

export const CallSheetView: React.FC<CallSheetViewProps> = ({
  titlePage,
  scenes,
  shootDays,
  castCalls,
  crewContacts,
  doodReport,
  onUpdateShootDay,
  onUpdateCastCall,
  onUpdateCrewContacts,
  onJumpToStripboard,
}) => {
  const orderedDays = [...shootDays].sort((a, b) => a.dayNumber - b.dayNumber);
  const [selectedDayId, setSelectedDayId] = useState<string>(orderedDays[0]?.id ?? '');
  const [copied, setCopied] = useState(false);

  const activeDay =
    orderedDays.find((d) => d.id === selectedDayId) ?? orderedDays[0] ?? null;

  if (!activeDay) {
    return (
      <Card className="p-8 text-center">
        <FileSpreadsheet className="w-8 h-8 text-[var(--accent)] mx-auto mb-3 opacity-80" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          No Shoot Days Available for Call Sheet
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1 mb-4">
          Schedule your scenes on Shoot Days in the Stripboard first. SlateDraft will then
          auto-populate each day&apos;s Call Sheet with scenes, cast calls, and department alerts.
        </p>
        <Button variant="primary" size="sm" onClick={onJumpToStripboard}>
          Go to Stripboard
        </Button>
      </Card>
    );
  }

  const sceneMap = new Map(scenes.map((s) => [s.sceneId, s]));
  const dayScenes = activeDay.sceneIds
    .map((id) => sceneMap.get(id))
    .filter((s): s is SceneBreakdown => Boolean(s));
  const totalEighths = dayScenes.reduce((sum, s) => sum + s.eighths, 0);
  const castInDay = Array.from(new Set(dayScenes.flatMap((s) => s.cast))).sort();
  const doodByChar = new Map(doodReport.rows.map((r) => [r.characterName, r]));

  // Aggregate all department cues needed on this shoot day
  const deptAlerts: Array<{ label: string; items: string[] }> = [];
  for (const cat of DEPARTMENT_CATEGORIES) {
    const set = new Set<string>();
    for (const sc of dayScenes) {
      (sc.productionTags[cat.key as keyof ProductionTags] ?? []).forEach((item) =>
        set.add(item)
      );
    }
    if (set.size > 0) {
      deptAlerts.push({ label: cat.label, items: Array.from(set) });
    }
  }

  const resolvedCrewContacts =
    crewContacts && crewContacts.length > 0 ? crewContacts : DEFAULT_CREW_CONTACTS;

  const handleUpdateCrewRow = (index: number, patch: Partial<CrewContact>) => {
    if (!onUpdateCrewContacts) return;
    const next = resolvedCrewContacts.map((row, i) =>
      i === index ? { ...row, ...patch } : row
    );
    onUpdateCrewContacts(next);
  };

  const handleAddCrewRow = () => {
    if (!onUpdateCrewContacts) return;
    onUpdateCrewContacts([
      ...resolvedCrewContacts,
      { role: '', name: '', phone: '' },
    ]);
  };

  const handleRemoveCrewRow = (index: number) => {
    if (!onUpdateCrewContacts || resolvedCrewContacts.length <= 1) return;
    onUpdateCrewContacts(resolvedCrewContacts.filter((_, i) => i !== index));
  };

  const handleCopyCallSheet = async () => {
    const baseText = formatCallSheetText(
      activeDay,
      dayScenes,
      titlePage,
      castCalls,
      doodReport
    );
    const populatedCrew = resolvedCrewContacts.filter(
      (c) => c.name.trim().length > 0 || c.phone.trim().length > 0
    );
    const crewSection =
      populatedCrew.length > 0
        ? [
            '',
            '--- KEY CREW CONTACTS ---',
            ...populatedCrew.map((c) => {
              const role = c.role.trim() || 'Crew';
              const name = c.name.trim() || 'TBD';
              const phone = c.phone.trim();
              return `${role}: ${name}${phone ? ` (${phone})` : ''}`;
            }),
          ].join('\n')
        : '';
    const text = `${baseText}${crewSection}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] no-print">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            ariaLabel="Select Shoot Day for Call Sheet"
            value={activeDay.id}
            onChange={setSelectedDayId}
            options={orderedDays.map((d) => ({
              value: d.id,
              label: `Day ${d.dayNumber}${d.shootDate ? ` (${d.shootDate})` : ''} — ${d.sceneIds.length} scenes`,
            }))}
          />
          <Badge variant="amber" mono>
            {dayScenes.length > 0 ? formatPageEighths(totalEighths) : '0 pgs'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />
            }
            onClick={handleCopyCallSheet}
          >
            {copied ? 'Copied for Crew Group' : 'Copy WhatsApp / Crew Text'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={() => window.print()}
          >
            Print Call Sheet
          </Button>
        </div>
      </div>

      {/* Printable Call Sheet Surface */}
      <Card className="p-6 space-y-6 script-page-surface">
        {/* Masthead */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-text)]">
              Daily Production Call Sheet
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mt-0.5">
              {titlePage.title || 'UNTITLED PRODUCTION'}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {titlePage.productionHouse || 'Production Office'} • {titlePage.draftName || 'Shooting Draft'}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-mono uppercase text-[var(--text-muted)]">
              General Crew Call
            </div>
            <div className="text-2xl font-mono font-bold text-[var(--accent-text)] tabular-nums">
              {activeDay.generalCall || '07:00'}
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)]">
              DAY {activeDay.dayNumber} of {orderedDays.length}
            </div>
          </div>
        </div>

        {/* Editable Logistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="Shoot Date"
            type="date"
            value={activeDay.shootDate}
            onChange={(e) =>
              onUpdateShootDay(activeDay.id, { shootDate: e.target.value })
            }
          />
          <Input
            label="General Crew Call"
            value={activeDay.generalCall}
            onChange={(e) =>
              onUpdateShootDay(activeDay.id, { generalCall: e.target.value })
            }
            placeholder="07:00"
          />
          <Input
            label="Sunrise / Sunset"
            value={activeDay.sunriseSunset}
            onChange={(e) =>
              onUpdateShootDay(activeDay.id, { sunriseSunset: e.target.value })
            }
            placeholder="06:15 / 18:20"
          />
          <Input
            label="Nearest Hospital / ER"
            value={activeDay.nearestHospital}
            onChange={(e) =>
              onUpdateShootDay(activeDay.id, { nearestHospital: e.target.value })
            }
            placeholder="Hospital name & distance"
          />
          <Input
            label="Primary Location Address"
            containerClassName="sm:col-span-2"
            value={activeDay.locationAddress}
            onChange={(e) =>
              onUpdateShootDay(activeDay.id, { locationAddress: e.target.value })
            }
            placeholder="Stage / Address / Parking instructions"
          />
          <Input
            label="Weather & Safety Notes"
            containerClassName="sm:col-span-2"
            value={activeDay.safetyNotes}
            onChange={(e) =>
              onUpdateShootDay(activeDay.id, { safetyNotes: e.target.value })
            }
            placeholder="Rain cover, night visibility, stunt safety briefing..."
          />
        </div>

        {/* Day Scene Schedule */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Scheduled Scenes ({dayScenes.length} • {dayScenes.length > 0 ? formatPageEighths(totalEighths) : '0 pgs'})
          </h4>
          {dayScenes.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              No scenes assigned to Day {activeDay.dayNumber}.
            </p>
          ) : (
            <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                    <th className="py-2 px-3">Sc #</th>
                    <th className="py-2 px-3">Set &amp; Description</th>
                    <th className="py-2 px-3">D/N</th>
                    <th className="py-2 px-3">Cast</th>
                    <th className="py-2 px-3 text-right">Pages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {dayScenes.map((sc) => (
                    <tr key={sc.sceneId}>
                      <td className="py-2 px-3 font-mono font-bold text-[var(--text-primary)]">
                        {sc.sceneNumber}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono font-semibold text-[var(--text-primary)]">
                          {sc.heading}
                        </div>
                        {sc.synopsis && (
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {sc.synopsis}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[var(--text-secondary)]">
                        {sc.timeOfDay}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-secondary)]">
                        {sc.cast.join(', ') || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-[var(--accent-text)]">
                        {formatPageEighths(sc.eighths)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cast Call Table */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Cast Calls ({castInDay.length})
          </h4>
          {castInDay.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              No speaking cast required on Day {activeDay.dayNumber}.
            </p>
          ) : (
            <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                    <th className="py-2 px-3">Character</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Actor / Talent</th>
                    <th className="py-2 px-3">Call</th>
                    <th className="py-2 px-3">H/M/W</th>
                    <th className="py-2 px-3">On Set</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {castInDay.map((ch) => {
                    const entry = castCalls[ch] ?? {
                      characterName: ch,
                      actorName: '',
                      callTime: activeDay.generalCall || '07:00',
                      hmwTime: '07:30',
                      onSetTime: '08:15',
                    };
                    const code = doodByChar.get(ch)?.codesByDayId[activeDay.id] || 'W';

                    return (
                      <tr key={ch}>
                        <td className="py-2 px-3 font-mono font-semibold text-[var(--text-primary)]">
                          {ch}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="amber" mono>
                            {code}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={entry.actorName}
                            onChange={(e) =>
                              onUpdateCastCall(ch, { actorName: e.target.value })
                            }
                            placeholder="Actor name"
                            className="text-xs py-1"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={entry.callTime}
                            onChange={(e) =>
                              onUpdateCastCall(ch, { callTime: e.target.value })
                            }
                            className="text-xs py-1 font-mono w-20"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={entry.hmwTime}
                            onChange={(e) =>
                              onUpdateCastCall(ch, { hmwTime: e.target.value })
                            }
                            className="text-xs py-1 font-mono w-20"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={entry.onSetTime}
                            onChange={(e) =>
                              onUpdateCastCall(ch, { onSetTime: e.target.value })
                            }
                            className="text-xs py-1 font-mono w-20"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Key Crew Contacts */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[var(--accent)]" />
              Key Crew Contacts
            </h4>
            {onUpdateCrewContacts && (
              <Button
                variant="ghost"
                size="sm"
                className="no-print text-xs py-1 px-2"
                leftIcon={<Plus className="w-3 h-3" />}
                onClick={handleAddCrewRow}
              >
                Add Role
              </Button>
            )}
          </div>
          <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                  <th className="py-2 px-3 w-44">Role</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3 w-48">Phone / Radio</th>
                  {onUpdateCrewContacts && (
                    <th className="py-2 px-2 w-10 text-right no-print" aria-label="Actions" />
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {resolvedCrewContacts.map((contact, idx) => (
                  <tr key={`${contact.role}-${idx}`}>
                    <td className="py-1.5 px-3">
                      <Input
                        aria-label={`Crew role ${idx + 1}`}
                        value={contact.role}
                        onChange={(e) => handleUpdateCrewRow(idx, { role: e.target.value })}
                        placeholder="Role (e.g. Gaffer)"
                        className="text-xs py-1 font-semibold"
                        disabled={!onUpdateCrewContacts}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <Input
                        aria-label={`${contact.role || `Crew ${idx + 1}`} name`}
                        value={contact.name}
                        onChange={(e) => handleUpdateCrewRow(idx, { name: e.target.value })}
                        placeholder="Crew member name"
                        className="text-xs py-1"
                        disabled={!onUpdateCrewContacts}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <Input
                        aria-label={`${contact.role || `Crew ${idx + 1}`} phone`}
                        value={contact.phone}
                        onChange={(e) => handleUpdateCrewRow(idx, { phone: e.target.value })}
                        placeholder="+91 98XXX XXXXX"
                        className="text-xs py-1 font-mono"
                        disabled={!onUpdateCrewContacts}
                      />
                    </td>
                    {onUpdateCrewContacts && (
                      <td className="py-1.5 px-2 text-right no-print">
                        <IconButton
                          size="xs"
                          variant="ghost"
                          aria-label={`Remove ${contact.role || 'crew'} contact`}
                          disabled={resolvedCrewContacts.length <= 1}
                          onClick={() => handleRemoveCrewRow(idx)}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auto-Aggregated Department Requirements for This Day */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--accent)]" />
            Department Requirements on Set Today
          </h4>
          {deptAlerts.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              No props, wardrobe, stunts, or VFX elements tagged for today&apos;s scenes.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {deptAlerts.map((dept) => (
                <div
                  key={dept.label}
                  className="p-3 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    {dept.label}
                  </div>
                  <p className="text-xs text-[var(--text-primary)]">
                    {dept.items.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
