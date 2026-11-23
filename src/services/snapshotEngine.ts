import {
  ProductionTags,
  RevisionColor,
  ScriptBlock,
  TitlePageData,
} from '../types/screenplay';
import {
  invokeRustDiffSnapshots,
  invokeRustExportChangedScenesFountain,
  RustSnapshotDiffEntry,
  RustSnapshotDiffResult,
} from './rustBridge';

export interface DraftSnapshot {
  id: string;
  name: string;
  createdAt: string;
  revisionColor: RevisionColor;
  blocks: ScriptBlock[];
}

export type SnapshotDiffEntry = RustSnapshotDiffEntry;
export type SnapshotDiffResult = RustSnapshotDiffResult;

function cloneProductionTags(tags?: ProductionTags): ProductionTags | undefined {
  if (!tags) return undefined;
  return {
    props: [...tags.props],
    costumes: [...tags.costumes],
    vfx: [...tags.vfx],
    stunts: [...tags.stunts],
    extras: [...tags.extras],
    vehicles: [...tags.vehicles],
    songs: [...tags.songs],
  };
}

export function cloneScriptBlocks(blocks: ScriptBlock[]): ScriptBlock[] {
  return blocks.map((block) => ({
    ...block,
    productionTags: cloneProductionTags(block.productionTags),
  }));
}

export function createDraftSnapshot(
  name: string,
  revisionColor: RevisionColor,
  blocks: ScriptBlock[]
): DraftSnapshot {
  const trimmedName = name.trim() || 'Untitled Snapshot';
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  return {
    id: `snap-${Date.now()}-${uniqueSuffix}`,
    name: trimmedName,
    createdAt: new Date().toISOString(),
    revisionColor,
    blocks: cloneScriptBlocks(blocks),
  };
}

export async function diffDraftSnapshots(
  baseBlocks: ScriptBlock[],
  currentBlocks: ScriptBlock[]
): Promise<SnapshotDiffResult> {
  return invokeRustDiffSnapshots(baseBlocks, currentBlocks);
}

export async function exportChangedScenesFountain(
  titlePage: TitlePageData,
  baseBlocks: ScriptBlock[],
  currentBlocks: ScriptBlock[]
): Promise<string> {
  return invokeRustExportChangedScenesFountain(titlePage, baseBlocks, currentBlocks);
}
