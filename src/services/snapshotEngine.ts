import {
  ProductionTags,
  RevisionColor,
  ScriptBlock,
  TitlePageData,
} from '../types/screenplay';
import { invokeRustExportFountain } from './rustBridge';

export interface DraftSnapshot {
  id: string;
  name: string;
  createdAt: string;
  revisionColor: RevisionColor;
  blocks: ScriptBlock[];
}

export interface SnapshotDiffEntry {
  status: 'added' | 'removed' | 'modified';
  elementType: string;
  beforeText?: string;
  afterText?: string;
  sceneNumber?: string;
}

export interface SnapshotDiffResult {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  changedSceneNumbers: string[];
  entries: SnapshotDiffEntry[];
}

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

interface IndexedBlock {
  block: ScriptBlock;
  sceneNumber?: string;
}

function indexBlocksWithSceneNumbers(blocks: ScriptBlock[]): Map<string, IndexedBlock> {
  const map = new Map<string, IndexedBlock>();
  let currentSceneNumber: string | undefined;
  let autoSceneCounter = 0;

  for (const block of blocks) {
    if (block.elementType === 'scene-heading') {
      autoSceneCounter += 1;
      currentSceneNumber = block.sceneNumber?.trim() || String(autoSceneCounter);
    }
    map.set(block.id, { block, sceneNumber: currentSceneNumber });
  }

  return map;
}

function isBlockModified(base: ScriptBlock, current: ScriptBlock): boolean {
  return (
    base.text !== current.text ||
    base.elementType !== current.elementType ||
    base.omitted !== current.omitted ||
    base.isDualDialogue !== current.isDualDialogue ||
    (base.sceneNumber ?? '') !== (current.sceneNumber ?? '')
  );
}

export function diffDraftSnapshots(
  baseBlocks: ScriptBlock[],
  currentBlocks: ScriptBlock[]
): SnapshotDiffResult {
  const baseMap = indexBlocksWithSceneNumbers(baseBlocks);
  const currentMap = indexBlocksWithSceneNumbers(currentBlocks);

  const entries: SnapshotDiffEntry[] = [];
  const changedSceneSet = new Set<string>();
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  const recordScene = (sceneNumber?: string) => {
    if (sceneNumber) {
      changedSceneSet.add(sceneNumber);
    }
  };

  for (const current of currentBlocks) {
    const currentIndexed = currentMap.get(current.id);
    const baseIndexed = baseMap.get(current.id);

    if (!baseIndexed) {
      addedCount += 1;
      const sceneNumber = currentIndexed?.sceneNumber;
      recordScene(sceneNumber);
      entries.push({
        status: 'added',
        elementType: current.elementType,
        afterText: current.text,
        sceneNumber,
      });
    } else if (isBlockModified(baseIndexed.block, current)) {
      modifiedCount += 1;
      const sceneNumber = currentIndexed?.sceneNumber ?? baseIndexed.sceneNumber;
      recordScene(sceneNumber);
      entries.push({
        status: 'modified',
        elementType: current.elementType,
        beforeText: baseIndexed.block.text,
        afterText: current.text,
        sceneNumber,
      });
    }
  }

  for (const base of baseBlocks) {
    if (!currentMap.has(base.id)) {
      removedCount += 1;
      const baseIndexed = baseMap.get(base.id);
      const sceneNumber = baseIndexed?.sceneNumber;
      recordScene(sceneNumber);
      entries.push({
        status: 'removed',
        elementType: base.elementType,
        beforeText: base.text,
        sceneNumber,
      });
    }
  }

  return {
    addedCount,
    removedCount,
    modifiedCount,
    changedSceneNumbers: Array.from(changedSceneSet),
    entries,
  };
}

interface SceneChunk {
  key: string;
  sceneNumber?: string;
  blocks: ScriptBlock[];
}

function splitIntoSceneChunks(blocks: ScriptBlock[]): SceneChunk[] {
  const chunks: SceneChunk[] = [];
  let currentChunk: SceneChunk | null = null;
  let autoSceneCounter = 0;

  for (const block of blocks) {
    if (block.elementType === 'scene-heading') {
      autoSceneCounter += 1;
      const sceneNumber = block.sceneNumber?.trim() || String(autoSceneCounter);
      currentChunk = {
        key: `scene:${block.id}`,
        sceneNumber,
        blocks: [block],
      };
      chunks.push(currentChunk);
    } else {
      if (!currentChunk) {
        currentChunk = {
          key: 'preamble',
          sceneNumber: undefined,
          blocks: [],
        };
        chunks.push(currentChunk);
      }
      currentChunk.blocks.push(block);
    }
  }

  return chunks;
}

export async function exportChangedScenesFountain(
  titlePage: TitlePageData,
  baseBlocks: ScriptBlock[],
  currentBlocks: ScriptBlock[]
): Promise<string> {
  const baseMap = indexBlocksWithSceneNumbers(baseBlocks);
  const currentMap = indexBlocksWithSceneNumbers(currentBlocks);

  // Track which base scene chunks lost any block
  const baseChunks = splitIntoSceneChunks(baseBlocks);
  const scenesWithRemovals = new Set<string>();
  const sceneNumbersWithRemovals = new Set<string>();

  for (const chunk of baseChunks) {
    for (const block of chunk.blocks) {
      if (!currentMap.has(block.id)) {
        scenesWithRemovals.add(chunk.key);
        if (chunk.sceneNumber) {
          sceneNumbersWithRemovals.add(chunk.sceneNumber);
        }
        break;
      }
    }
  }

  const currentChunks = splitIntoSceneChunks(currentBlocks);
  const changedBlocks: ScriptBlock[] = [];

  for (const chunk of currentChunks) {
    let chunkChanged =
      scenesWithRemovals.has(chunk.key) ||
      (chunk.sceneNumber !== undefined && sceneNumbersWithRemovals.has(chunk.sceneNumber));

    if (!chunkChanged) {
      for (const block of chunk.blocks) {
        const baseIndexed = baseMap.get(block.id);
        if (!baseIndexed || isBlockModified(baseIndexed.block, block)) {
          chunkChanged = true;
          break;
        }
      }
    }

    if (chunkChanged) {
      changedBlocks.push(...chunk.blocks);
    }
  }

  return invokeRustExportFountain(titlePage, changedBlocks);
}
