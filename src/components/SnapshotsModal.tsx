import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Download,
  GitCompare,
  History,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  RevisionColor,
  ScriptBlock,
  TitlePageData,
} from '../types/screenplay';
import {
  DraftSnapshot,
  diffDraftSnapshots,
  exportChangedScenesFountain,
} from '../services/snapshotEngine';
import {
  Badge,
  BadgeVariant,
  Button,
  Card,
  IconButton,
  Input,
  Modal,
  Select,
} from './ui';

export interface SnapshotsModalProps {
  open: boolean;
  onClose: () => void;
  snapshots: DraftSnapshot[];
  currentBlocks: ScriptBlock[];
  currentRevisionColor: RevisionColor;
  titlePage: TitlePageData;
  onSaveSnapshot: (name: string) => void;
  onRestoreSnapshot: (snapshot: DraftSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
}

const REVISION_BADGE_VARIANT: Record<RevisionColor, BadgeVariant> = {
  white: 'stone',
  blue: 'sky',
  pink: 'rose',
  yellow: 'amber',
  green: 'emerald',
  goldenrod: 'orange',
  buff: 'stone',
  salmon: 'rose',
  cherry: 'red',
};

const QUICK_SNAPSHOT_PRESETS = [
  'White Lock',
  'Blue Shooting Draft',
  'Pink Revision',
  'Production Lock',
];

function formatSnapshotTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slugifyTitle(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'screenplay';
}

export const SnapshotsModal: React.FC<SnapshotsModalProps> = ({
  open,
  onClose,
  snapshots,
  currentBlocks,
  currentRevisionColor,
  titlePage,
  onSaveSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
}) => {
  const [snapshotName, setSnapshotName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  // Keep selectedSnapshotId synced with available snapshots (default to most recent)
  useEffect(() => {
    if (snapshots.length === 0) {
      setSelectedSnapshotId('');
      setConfirmRestoreId(null);
      return;
    }
    const stillExists = snapshots.some((s) => s.id === selectedSnapshotId);
    if (!stillExists) {
      setSelectedSnapshotId(snapshots[0].id);
    }
  }, [snapshots, selectedSnapshotId]);

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => s.id === selectedSnapshotId) ?? snapshots[0] ?? null,
    [snapshots, selectedSnapshotId]
  );

  const diffResult = useMemo(() => {
    if (!selectedSnapshot) return null;
    return diffDraftSnapshots(selectedSnapshot.blocks, currentBlocks);
  }, [selectedSnapshot, currentBlocks]);

  const totalChanges = diffResult
    ? diffResult.addedCount + diffResult.modifiedCount + diffResult.removedCount
    : 0;

  const selectOptions = useMemo(
    () =>
      snapshots.map((snap) => ({
        value: snap.id,
        label: `${snap.name} (${snap.revisionColor.toUpperCase()} · ${formatSnapshotTimestamp(
          snap.createdAt
        )})`,
      })),
    [snapshots]
  );

  const handleSave = () => {
    const trimmed = snapshotName.trim();
    if (!trimmed) return;
    onSaveSnapshot(trimmed);
    setSnapshotName('');
  };

  const handleDownloadChangedFountain = () => {
    if (!selectedSnapshot || totalChanges === 0) return;
    const fountain = exportChangedScenesFountain(
      titlePage,
      selectedSnapshot.blocks,
      currentBlocks
    );
    const blob = new Blob([fountain], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugifyTitle(titlePage.title)}-changed-pages.fountain`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Draft Snapshots & Revision Comparison"
      subtitle="Lock draft milestones, compare changes block-by-block, restore earlier drafts, or export Changed Pages Only."
      icon={<History className="w-4 h-4" />}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--text-muted)]">
            {snapshots.length} saved {snapshots.length === 1 ? 'snapshot' : 'snapshots'} ·{' '}
            {currentBlocks.length} blocks in active draft
          </span>
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Save New Snapshot Section */}
        <Card className="p-4 bg-[var(--bg-surface-2)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Capture New Draft Snapshot
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Active Revision:
              </span>
              <Badge variant={REVISION_BADGE_VARIANT[currentRevisionColor]} uppercase mono>
                {currentRevisionColor}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <Input
              label="Snapshot Label"
              containerClassName="flex-1"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="e.g. White Lock, Blue Shooting Draft, Director Notes..."
            />
            <Button
              variant="primary"
              size="md"
              leftIcon={<Camera className="w-3.5 h-3.5" />}
              disabled={!snapshotName.trim()}
              onClick={handleSave}
            >
              Save Snapshot
            </Button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mr-1">
              Quick labels:
            </span>
            {QUICK_SNAPSHOT_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant="secondary"
                size="xs"
                onClick={() => setSnapshotName(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
        </Card>

        {/* Main Comparison Workspace */}
        {snapshots.length === 0 ? (
          <Card className="p-8 text-center">
            <History className="w-7 h-7 mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-xs font-medium text-[var(--text-primary)]">
              No draft snapshots saved yet
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
              Save a milestone like &ldquo;White Lock&rdquo; before starting revisions. You can then
              compare your current draft against it, restore at any time, or export Changed Pages
              Only as Fountain.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[270px_1fr] gap-4 items-start">
            {/* Saved Snapshots List */}
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] px-0.5">
                Saved Milestones ({snapshots.length})
              </div>
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {snapshots.map((snap) => {
                  const isSelected = selectedSnapshot?.id === snap.id;
                  const isConfirmingRestore = confirmRestoreId === snap.id;

                  return (
                    <Card
                      key={snap.id}
                      interactive
                      onClick={() => setSelectedSnapshotId(snap.id)}
                      className={`p-3 transition-colors ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {snap.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                            {formatSnapshotTimestamp(snap.createdAt)} · {snap.blocks.length} blocks
                          </div>
                        </div>
                        <Badge
                          variant={REVISION_BADGE_VARIANT[snap.revisionColor]}
                          uppercase
                          mono
                          className="shrink-0"
                        >
                          {snap.revisionColor}
                        </Badge>
                      </div>

                      <div
                        className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isConfirmingRestore ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="amber-soft"
                              size="xs"
                              onClick={() => {
                                onRestoreSnapshot(snap);
                                setConfirmRestoreId(null);
                              }}
                            >
                              Confirm Restore
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setConfirmRestoreId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="xs"
                            leftIcon={<RotateCcw className="w-3 h-3" />}
                            onClick={() => setConfirmRestoreId(snap.id)}
                          >
                            Restore
                          </Button>
                        )}

                        <IconButton
                          size="xs"
                          variant="danger"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          aria-label={`Delete snapshot ${snap.name}`}
                          title="Delete snapshot"
                          onClick={() => {
                            if (confirmRestoreId === snap.id) setConfirmRestoreId(null);
                            onDeleteSnapshot(snap.id);
                          }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Diff Comparison Panel */}
            <div className="space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <Select
                  label="Compare Current Draft Against"
                  value={selectedSnapshot?.id ?? ''}
                  onChange={(val) => setSelectedSnapshotId(val)}
                  options={selectOptions}
                  leftIcon={<GitCompare className="w-3.5 h-3.5" />}
                  className="flex-1 min-w-0"
                />
                <Button
                  variant="amber-soft"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  disabled={!selectedSnapshot || totalChanges === 0}
                  onClick={handleDownloadChangedFountain}
                  title={
                    totalChanges === 0
                      ? 'No changed scenes to export'
                      : 'Export only scenes modified since this snapshot as .fountain'
                  }
                >
                  Changed Pages Only (.fountain)
                </Button>
              </div>

              {diffResult && (
                <>
                  {/* Diff Summary Bar */}
                  <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]">
                    <Badge variant="emerald" mono>
                      +{diffResult.addedCount} Added
                    </Badge>
                    <Badge variant="amber" mono>
                      ~{diffResult.modifiedCount} Modified
                    </Badge>
                    <Badge variant="red" mono>
                      -{diffResult.removedCount} Removed
                    </Badge>

                    {diffResult.changedSceneNumbers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 ml-auto text-[11px] text-[var(--text-secondary)]">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          Changed Scenes:
                        </span>
                        {diffResult.changedSceneNumbers.map((sc) => (
                          <Badge key={sc} variant="outline" mono>
                            #{sc}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Diff Entries List */}
                  {diffResult.entries.length === 0 ? (
                    <Card className="p-6 text-center">
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        No changes since &ldquo;{selectedSnapshot?.name}&rdquo;
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">
                        Your current screenplay matches this snapshot block-for-block.
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {diffResult.entries.map((entry, idx) => {
                        const statusVariant: BadgeVariant =
                          entry.status === 'added'
                            ? 'emerald'
                            : entry.status === 'removed'
                              ? 'red'
                              : 'amber';

                        return (
                          <Card key={`${entry.status}-${entry.elementType}-${idx}`} className="p-3">
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <Badge variant={statusVariant} uppercase mono>
                                {entry.status}
                              </Badge>
                              <Badge variant="stone" mono>
                                {entry.elementType}
                              </Badge>
                              {entry.sceneNumber && (
                                <Badge variant="outline" mono>
                                  Scene {entry.sceneNumber}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-1 font-script text-xs leading-relaxed">
                              {entry.beforeText !== undefined && (
                                <div className="px-2 py-1 rounded bg-[var(--badge-red-bg)] text-[var(--badge-red-text)] line-through opacity-90 whitespace-pre-wrap break-words">
                                  - {entry.beforeText || '(empty)'}
                                </div>
                              )}
                              {entry.afterText !== undefined && (
                                <div className="px-2 py-1 rounded bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] whitespace-pre-wrap break-words">
                                  + {entry.afterText || '(empty)'}
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
