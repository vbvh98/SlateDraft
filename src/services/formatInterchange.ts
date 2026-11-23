import { RevisionColor, ScriptBlock, TitlePageData } from '../types/screenplay';
import {
  invokeRustExtractFdxTitlePage,
  invokeRustFormatStyledHtml,
  invokeRustFormatWhatsApp,
  invokeRustMoveSceneChunk,
  invokeRustParseFdxXml,
} from './rustBridge';

export async function extractFdxTitlePage(xml: string): Promise<Partial<TitlePageData>> {
  return invokeRustExtractFdxTitlePage(xml);
}

export async function parseFdxXml(
  xml: string,
  activeRevision: RevisionColor = 'white'
): Promise<ScriptBlock[]> {
  return invokeRustParseFdxXml(xml, activeRevision);
}

export async function formatWhatsAppReadableText(blocks: ScriptBlock[]): Promise<string> {
  return invokeRustFormatWhatsApp(blocks);
}

export async function formatStyledHtmlClipboard(blocks: ScriptBlock[]): Promise<string> {
  return invokeRustFormatStyledHtml(blocks);
}

export async function moveSceneChunk(
  blocks: ScriptBlock[],
  sceneId: string,
  direction: 'up' | 'down',
  lockMode: boolean
): Promise<ScriptBlock[]> {
  return invokeRustMoveSceneChunk(blocks, sceneId, direction, lockMode);
}
