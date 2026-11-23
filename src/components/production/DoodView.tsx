import React from 'react';
import { AlertTriangle, Download, Users } from 'lucide-react';
import { ShootDay } from '../../types/screenplay';
import { DoodCode, DoodReport } from '../../services/productionEngine';
import { Badge, Button, Card } from '../ui';

export interface DoodViewProps {
  doodReport: DoodReport;
  shootDays: ShootDay[];
  onExportCsv: () => void;
  onJumpToStripboard: () => void;
}

const CODE_STYLES: Record<DoodCode, string> = {
  '': 'text-[var(--text-muted)]',
  SW: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 font-bold',
  W: 'bg-amber-500/15 text-amber-400 border border-amber-500/35 font-bold',
  WF: 'bg-sky-500/15 text-sky-400 border border-sky-500/35 font-bold',
  SWF: 'bg-purple-500/15 text-purple-300 border border-purple-500/35 font-bold',
  H: 'bg-red-500/15 text-red-400 border border-red-500/40 font-bold',
};

export const DoodView: React.FC<DoodViewProps> = ({
  doodReport,
  shootDays,
  onExportCsv,
  onJumpToStripboard,
}) => {
  const orderedDays = [...shootDays].sort((a, b) => a.dayNumber - b.dayNumber);

  if (orderedDays.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-8 h-8 text-[var(--accent)] mx-auto mb-3 opacity-80" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Schedule Shoot Days to Generate Day-Out-of-Days
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1 mb-4">
          Once scenes are placed on Shoot Days in the Stripboard, SlateDraft automatically computes
          Start/Work/Hold/Finish codes and flags paid actor Hold days.
        </p>
        <Button variant="primary" size="sm" onClick={onJumpToStripboard}>
          Open Stripboard
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Hold-Day Budget Impact Alert */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Day-Out-of-Days (DOOD) Cast Matrix
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Track actor work windows and eliminate unnecessary paid Hold (H) days before lock.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {doodReport.totalHoldDays > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--danger-soft)] border border-[var(--danger-border)] text-xs text-[var(--danger-text)]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">
                {doodReport.totalHoldDays} Paid Hold Day{doodReport.totalHoldDays === 1 ? '' : 's'}{' '}
                Detected
              </span>
            </div>
          ) : (
            <Badge variant="emerald">0 Hold Days — Optimal Cast Schedule</Badge>
          )}

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={onExportCsv}
          >
            Export DOOD (.CSV)
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)] px-1">
        <span className="inline-flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${CODE_STYLES.SW}`}>SW</span>
          Start &amp; Work
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${CODE_STYLES.W}`}>W</span>
          Work
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${CODE_STYLES.H}`}>H</span>
          Hold (Idle Paid Day)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${CODE_STYLES.WF}`}>WF</span>
          Work &amp; Finish
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${CODE_STYLES.SWF}`}>
            SWF
          </span>
          Single-Day Shoot
        </span>
      </div>

      {/* DOOD Matrix Table */}
      <Card className="overflow-hidden">
        {doodReport.rows.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] p-6 text-center">
            No speaking characters detected in scheduled scenes yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-2.5 px-4 sticky left-0 bg-[var(--bg-surface-2)] z-10 min-w-[160px]">
                    Cast Member
                  </th>
                  <th className="py-2.5 px-3 text-center">Work</th>
                  <th className="py-2.5 px-3 text-center">Hold</th>
                  <th className="py-2.5 px-3 text-center">Span</th>
                  {orderedDays.map((day) => (
                    <th key={day.id} className="py-2.5 px-2.5 text-center font-mono min-w-[56px]">
                      D{day.dayNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {doodReport.rows.map((row) => (
                  <tr
                    key={row.characterName}
                    className="hover:bg-[var(--bg-surface-2)]/50 transition-colors"
                  >
                    <td className="py-2.5 px-4 sticky left-0 bg-[var(--bg-surface)] font-mono font-semibold text-[var(--text-primary)]">
                      {row.characterName}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[var(--accent-text)] font-semibold">
                      {row.workDays}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                      <span
                        className={
                          row.holdDays > 0
                            ? 'text-[var(--danger-text)] font-bold'
                            : 'text-[var(--text-muted)]'
                        }
                      >
                        {row.holdDays}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[var(--text-secondary)]">
                      {row.totalSpanDays}d
                    </td>
                    {orderedDays.map((day) => {
                      const code = row.codesByDayId[day.id] ?? '';
                      return (
                        <td key={day.id} className="py-2 px-2 text-center">
                          {code ? (
                            <span
                              className={`inline-block min-w-[34px] px-1.5 py-0.5 rounded font-mono text-[10px] ${CODE_STYLES[code]}`}
                            >
                              {code}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] opacity-35">·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
