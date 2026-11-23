import { ElementType, RevisionColor, ScriptBlock, TitlePageData } from '../types/screenplay';
import { invokeRustSceneLocks } from './rustBridge';

function xmlUnescape(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

const VALID_REVISION_COLORS = new Set<RevisionColor>([
  'white',
  'blue',
  'pink',
  'yellow',
  'green',
  'goldenrod',
  'buff',
  'salmon',
  'cherry',
]);

function mapFdxTypeToElement(rawType: string): ElementType {
  switch (rawType.trim().toLowerCase()) {
    case 'scene heading':
      return 'scene-heading';
    case 'action':
      return 'action';
    case 'character':
      return 'character';
    case 'parenthetical':
      return 'parenthetical';
    case 'dialogue':
      return 'dialogue';
    case 'transition':
      return 'transition';
    case 'shot':
      return 'shot';
    case 'lyric':
    case 'song lyric':
      return 'song-lyric';
    case 'new act':
    case 'act':
    case 'end of act':
      return 'section-act';
    case 'general':
    case 'note':
      return 'note';
    default:
      return 'action';
  }
}

function extractXmlAttr(attrString: string, attrName: string): string | undefined {
  const regex = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const match = attrString.match(regex);
  if (!match) return undefined;
  return xmlUnescape(match[1] ?? match[2] ?? '');
}

function extractParagraphText(innerXml: string): string {
  const textMatches = innerXml.matchAll(/<Text(?:\s[^>]*)?>([\s\S]*?)<\/Text>/gi);
  let combined = '';
  let foundTextTag = false;
  for (const m of textMatches) {
    foundTextTag = true;
    combined += xmlUnescape(m[1]);
  }
  if (foundTextTag) {
    return combined;
  }
  return xmlUnescape(innerXml.replace(/<[^>]+>/g, ''));
}

export function extractFdxTitlePage(xml: string): Partial<TitlePageData> {
  const titlePageMatch = xml.match(/<TitlePage\b[^>]*>([\s\S]*?)<\/TitlePage>/i);
  if (!titlePageMatch) return {};

  const titlePageXml = titlePageMatch[1];
  const result: Partial<TitlePageData> = {};
  const paragraphRegex = /<Paragraph\b([^>]*)>([\s\S]*?)<\/Paragraph>/gi;

  for (const match of titlePageXml.matchAll(paragraphRegex)) {
    const attrs = match[1] ?? '';
    const inner = match[2] ?? '';
    const pType = (extractXmlAttr(attrs, 'Type') ?? '').trim().toLowerCase();
    const text = extractParagraphText(inner).trim();
    if (!text) continue;

    if (pType === 'title' && !result.title) {
      result.title = text;
    } else if ((pType === 'author' || pType === 'authors') && !result.writtenBy) {
      result.writtenBy = text;
    }
  }

  return result;
}

export function parseFdxXml(
  xml: string,
  activeRevision: RevisionColor = 'white'
): ScriptBlock[] {
  // Strip TitlePage so title/author paragraphs are not imported as script body blocks
  const withoutTitlePage = xml.replace(/<TitlePage\b[^>]*>[\s\S]*?<\/TitlePage>/gi, '');

  // Prefer the main <Content>...</Content> block if present
  const contentMatch = withoutTitlePage.match(/<Content\b[^>]*>([\s\S]*?)<\/Content>/i);
  const bodyXml = contentMatch ? contentMatch[1] : withoutTitlePage;

  // Mark paragraphs inside <DualDialogue>...</DualDialogue> blocks
  const normalizedXml = bodyXml.replace(
    /<DualDialogue\b[^>]*>([\s\S]*?)<\/DualDialogue>/gi,
    (_, inner: string) =>
      inner.replace(/<Paragraph\b([^>]*)>/gi, '<Paragraph$1 DualDialogue="Yes">')
  );

  const blocks: ScriptBlock[] = [];
  const paragraphRegex = /<Paragraph\b([^>]*)>([\s\S]*?)<\/Paragraph>/gi;
  let sceneCount = 1;
  let idx = 0;

  for (const match of normalizedXml.matchAll(paragraphRegex)) {
    const attrs = match[1] ?? '';
    const inner = match[2] ?? '';
    const rawType = extractXmlAttr(attrs, 'Type') ?? 'Action';
    const text = extractParagraphText(inner).replace(/\r\n/g, '\n');

    if (!text.trim()) continue;

    const elementType = mapFdxTypeToElement(rawType);
    const numAttr = extractXmlAttr(attrs, 'Number');
    const dualAttr = extractXmlAttr(attrs, 'DualDialogue');
    const revAttr = extractXmlAttr(attrs, 'RevisionID')?.toLowerCase() as
      | RevisionColor
      | undefined;

    const revisionColor: RevisionColor =
      revAttr && VALID_REVISION_COLORS.has(revAttr) ? revAttr : activeRevision;

    const block: ScriptBlock = {
      id: `fdx-${Date.now()}-${idx++}-${Math.random().toString(36).slice(2, 6)}`,
      elementType,
      text,
      locked: false,
      omitted: false,
      revisionColor,
      isDualDialogue: dualAttr?.toLowerCase() === 'yes' || dualAttr?.toLowerCase() === 'true',
    };

    if (elementType === 'scene-heading') {
      block.sceneNumber = numAttr?.trim() || String(sceneCount++);
    } else if (elementType === 'section-act') {
      block.actMarker = text.trim();
    }

    blocks.push(block);
  }

  return blocks;
}

export function formatWhatsAppReadableText(blocks: ScriptBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.omitted) continue;
    switch (b.elementType) {
      case 'section-act':
        out.push(`\n━━━ ${b.text.toUpperCase()} ━━━\n`);
        break;
      case 'scene-heading': {
        const num = b.sceneNumber ? `${b.sceneNumber}. ` : '';
        out.push(`\n*${num}${b.text.toUpperCase()}*`);
        break;
      }
      case 'character':
        out.push(`\n      *${b.text.toUpperCase()}*`);
        break;
      case 'parenthetical':
        out.push(`      _${b.text}_`);
        break;
      case 'dialogue':
        out.push(`   ${b.text}`);
        break;
      case 'song-lyric':
        out.push(`\n   ♪ _${b.text}_ ♪`);
        break;
      case 'transition':
        out.push(`\n                        *${b.text.toUpperCase()}*`);
        break;
      default:
        out.push(`\n${b.text}`);
        break;
    }
  }
  return out.join('\n').trim();
}

export function formatStyledHtmlClipboard(blocks: ScriptBlock[]): string {
  const rows = blocks
    .filter((b) => !b.omitted)
    .map((b) => {
      switch (b.elementType) {
        case 'scene-heading':
          return `<p style="font-family:'Courier New',monospace;font-weight:bold;text-transform:uppercase;margin-top:16px;">${b.sceneNumber ? `${b.sceneNumber}. ` : ''}${b.text}</p>`;
        case 'character':
          return `<p style="font-family:'Courier New',monospace;text-transform:uppercase;margin-left:2.2in;margin-top:12px;margin-bottom:0;">${b.text}</p>`;
        case 'parenthetical':
          return `<p style="font-family:'Courier New',monospace;margin-left:1.6in;margin-top:0;margin-bottom:0;">${b.text}</p>`;
        case 'dialogue':
          return `<p style="font-family:'Courier New',monospace;margin-left:1.0in;margin-right:1.5in;margin-top:0;">${b.text}</p>`;
        case 'transition':
          return `<p style="font-family:'Courier New',monospace;text-align:right;text-transform:uppercase;margin-top:12px;">${b.text}</p>`;
        case 'song-lyric':
          return `<p style="font-family:'Courier New',monospace;font-style:italic;margin-left:1.2in;color:#b45309;">♪ ${b.text}</p>`;
        default:
          return `<p style="font-family:'Courier New',monospace;margin-top:8px;">${b.text}</p>`;
      }
    })
    .join('\n');

  return `<div style="max-width:6.5in;margin:0 auto;">${rows}</div>`;
}

export async function moveSceneChunk(
  blocks: ScriptBlock[],
  sceneId: string,
  direction: 'up' | 'down',
  lockMode: boolean
): Promise<ScriptBlock[]> {
  interface SceneChunkRange {
    id: string;
    start: number;
    end: number;
  }

  const chunks: SceneChunkRange[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].elementType === 'scene-heading') {
      let end = i + 1;
      while (
        end < blocks.length &&
        blocks[end].elementType !== 'scene-heading' &&
        blocks[end].elementType !== 'section-act'
      ) {
        end++;
      }
      chunks.push({ id: blocks[i].id, start: i, end });
    }
  }

  const currentIdx = chunks.findIndex((c) => c.id === sceneId);
  if (currentIdx === -1) return blocks;

  const targetChunkIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
  if (targetChunkIdx < 0 || targetChunkIdx >= chunks.length) return blocks;

  const current = chunks[currentIdx];
  const target = chunks[targetChunkIdx];
  const chunkLen = current.end - current.start;

  const copy = [...blocks];
  const extracted = copy.splice(current.start, chunkLen);

  if (direction === 'up') {
    // target is before current, so target.start is unchanged after splice
    copy.splice(target.start, 0, ...extracted);
  } else {
    // target is after current, so target.end shifted left by chunkLen after splice
    copy.splice(target.end - chunkLen, 0, ...extracted);
  }

  return invokeRustSceneLocks(copy, lockMode);
}
