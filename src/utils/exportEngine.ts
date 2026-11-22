import { jsPDF } from 'jspdf';
import {
  AlignmentType,
  Document as DocxDocument,
  ExternalHyperlink,
  Footer as DocxFooter,
  Header as DocxHeader,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph as DocxParagraph,
  ShadingType,
  Table as DocxTable,
  TableCell as DocxTableCell,
  TableRow as DocxTableRow,
  TextRun,
  WidthType,
} from 'docx';
import JSZip from 'jszip';
import { marked } from 'marked';
import TurndownService from 'turndown';
import type {
  ChartConfig,
  DocumentRecord,
  PageSetup,
  PaperSize,
  StructuredNode,
} from '../types/notely';
import { extractHeadings, extractPlainText, sanitizeHtml } from './documentUtils';

export type ExportFormat = 'pdf' | 'docx' | 'txt' | 'rtf' | 'html' | 'md' | 'odt';

export interface ExportResult {
  blob: Blob;
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  format: ExportFormat;
}

const PAPER_DIMENSIONS_MM: Record<Exclude<PaperSize, 'Custom'>, [number, number]> = {
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
};

const CHART_PALETTE = ['#8950F5', '#3B82F6', '#22C55E', '#EAB308', '#EC4899', '#14B8A6'];

export function getPaperDimensionsMm(setup: PageSetup): { widthMm: number; heightMm: number } {
  const base =
    setup.paperSize === 'Custom'
      ? [setup.customWidthMm ?? 210, setup.customHeightMm ?? 297]
      : PAPER_DIMENSIONS_MM[setup.paperSize];
  return setup.orientation === 'landscape'
    ? { widthMm: base[1], heightMm: base[0] }
    : { widthMm: base[0], heightMm: base[1] };
}

export function sanitizeFileName(title: string, ext: string): string {
  const safe = (title || 'Untitled Note')
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return `${safe || 'Untitled_Note'}.${ext}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeRtf(str: string): string {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (str[i] === '\\' || str[i] === '{' || str[i] === '}') {
      out += `\\${str[i]}`;
    } else if (code === 10) {
      out += '\\par\n';
    } else if (code > 127) {
      out += `\\u${code}?`;
    } else {
      out += str[i];
    }
  }
  return out;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const idx = dataUrl.indexOf(',');
    if (idx === -1) return null;
    const base64 = dataUrl.slice(idx + 1);
    if (typeof atob === 'function') {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  } catch {
    return null;
  }
}

function detectDocxImageType(dataUrl: string): 'png' | 'jpg' | 'gif' {
  const lower = dataUrl.slice(0, 48).toLowerCase();
  if (lower.includes('image/jpeg') || lower.includes('image/jpg')) return 'jpg';
  if (lower.includes('image/gif')) return 'gif';
  return 'png';
}

function collectFootnotes(doc: DocumentRecord): Array<{ number: number; text: string }> {
  const list: Array<{ number: number; text: string }> = [];
  const walk = (node: StructuredNode) => {
    if (node.type === 'footnote' && node.attrs?.text) {
      list.push({
        number: Number(node.attrs.number ?? list.length + 1),
        text: String(node.attrs.text),
      });
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
    }
  };
  for (const node of doc.content?.content ?? []) walk(node);
  return list;
}

function renderChartSvgMarkup(config: ChartConfig): string {
  const rows = config.rows?.length ? config.rows : [{ label: 'Item', value: 50 }];
  const maxVal = Math.max(1, ...rows.map((r) => Number(r.value) || 0));
  const totalVal = Math.max(1, rows.reduce((s, r) => s + Math.max(0, Number(r.value) || 0), 0));
  const title = escapeXml(config.title || 'Data Chart');

  if (config.chartType === 'pie' || config.chartType === 'doughnut') {
    let cumulative = 0;
    const r = 42;
    const circ = 2 * Math.PI * r;
    const slices = rows
      .map((row, idx) => {
        const pct = Math.max(0, Number(row.value) || 0) / totalVal;
        const dash = pct * circ;
        const offset = -cumulative * circ;
        cumulative += pct;
        const color = row.color || CHART_PALETTE[idx % CHART_PALETTE.length];
        return `<circle cx="60" cy="60" r="${r}" fill="transparent" stroke="${color}" stroke-width="${
          config.chartType === 'doughnut' ? 18 : 42
        }" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${offset}" transform="rotate(-90 60 60)" />`;
      })
      .join('');
    const legend = rows
      .map((row, idx) => {
        const color = row.color || CHART_PALETTE[idx % CHART_PALETTE.length];
        return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:12px;font-size:12px;"><span style="width:10px;height:10px;border-radius:999px;background:${color};display:inline-block;"></span>${escapeXml(row.label)}: ${row.value}</span>`;
      })
      .join('');
    return `<div style="border:1px solid #ECEAF1;border-radius:12px;padding:14px;margin:14px 0;background:#FBFBFD;"><div style="font-weight:700;margin-bottom:8px;">${title}</div><div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;"><svg viewBox="0 0 120 120" width="120" height="120">${slices}</svg><div>${legend}</div></div></div>`;
  }

  const barsOrPts =
    config.chartType === 'bar'
      ? rows
          .map((row, idx) => {
            const bw = Math.min(44, 260 / rows.length - 8);
            const gap = (300 - bw * rows.length) / Math.max(1, rows.length + 1);
            const x = 32 + gap + idx * (bw + gap);
            const h = (Math.max(0, Number(row.value) || 0) / maxVal) * 95;
            const y = 120 - h;
            const color = row.color || CHART_PALETTE[idx % CHART_PALETTE.length];
            return `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(3, h)}" rx="5" fill="${color}" /><text x="${
              x + bw / 2
            }" y="${y - 5}" text-anchor="middle" font-size="9" fill="#5C5A68">${row.value}</text><text x="${
              x + bw / 2
            }" y="136" text-anchor="middle" font-size="9" fill="#5C5A68">${escapeXml(
              row.label.slice(0, 10)
            )}</text>`;
          })
          .join('')
      : (() => {
          const pts = rows.map((row, idx) => ({
            x: 40 + (idx * 290) / Math.max(1, rows.length - 1),
            y: 115 - (Math.max(0, Number(row.value) || 0) / maxVal) * 90,
            row,
          }));
          const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const areaPath = `${linePath} L ${pts[pts.length - 1].x} 120 L ${pts[0].x} 120 Z`;
          return `${
            config.chartType === 'area' ? `<path d="${areaPath}" fill="#8950F5" fill-opacity="0.18" />` : ''
          }<path d="${linePath}" fill="none" stroke="#8950F5" stroke-width="2.5" />${pts
            .map(
              (p) =>
                `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#8950F5" /><text x="${p.x}" y="${
                  p.y - 8
                }" text-anchor="middle" font-size="9" fill="#5C5A68">${p.row.value}</text><text x="${
                  p.x
                }" y="136" text-anchor="middle" font-size="9" fill="#5C5A68">${escapeXml(
                  p.row.label.slice(0, 10)
                )}</text>`
            )
            .join('')}`;
        })();

  return `<div style="border:1px solid #ECEAF1;border-radius:12px;padding:14px;margin:14px 0;background:#FBFBFD;"><div style="font-weight:700;margin-bottom:8px;">${title}</div><svg viewBox="0 0 360 150" style="width:100%;max-width:460px;height:auto;"><line x1="28" y1="120" x2="345" y2="120" stroke="#D8D5E2" stroke-width="1" />${barsOrPts}</svg></div>`;
}

/**
 * 1. Plain Text (.txt) Export
 */
export function buildTxtExport(doc: DocumentRecord): ExportResult {
  const headerLine = doc.pageSetup.headerText ? `${doc.pageSetup.headerText}\n\n` : '';
  const footerLine = doc.pageSetup.footerText ? `\n\n${doc.pageSetup.footerText}` : '';
  const body = extractPlainText(doc.content) || doc.plainTextCache || '';
  const footnotes = collectFootnotes(doc);
  const footnotesBlock = footnotes.length
    ? `\n\nFootnotes:\n${footnotes.map((f) => `[${f.number}] ${f.text}`).join('\n')}`
    : '';
  const fullText = `${headerLine}${doc.title}\n${'='.repeat(Math.max(3, doc.title.length))}\n\n${body}${footnotesBlock}${footerLine}\n`;
  const bytes = new TextEncoder().encode(fullText);
  return {
    blob: new Blob([bytes], { type: 'text/plain;charset=utf-8' }),
    bytes,
    fileName: sanitizeFileName(doc.title, 'txt'),
    mimeType: 'text/plain',
    format: 'txt',
  };
}

/**
 * 2. Markdown (.md) Export
 */
export function buildMarkdownExport(doc: DocumentRecord): ExportResult {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  turndown.addRule('taskList', {
    filter: (node) => node.nodeName === 'LI' && (node as Element).getAttribute('data-type') === 'taskItem',
    replacement: (content, node) => {
      const checked = (node as Element).getAttribute('data-checked') === 'true';
      return `- [${checked ? 'x' : ' '}] ${content.trim()}\n`;
    },
  });

  const mdBody = doc.htmlCache
    ? turndown.turndown(sanitizeHtml(doc.htmlCache))
    : extractPlainText(doc.content);
  const fullMd = `# ${doc.title}\n\n${mdBody}\n`;
  const bytes = new TextEncoder().encode(fullMd);
  return {
    blob: new Blob([bytes], { type: 'text/markdown;charset=utf-8' }),
    bytes,
    fileName: sanitizeFileName(doc.title, 'md'),
    mimeType: 'text/markdown',
    format: 'md',
  };
}

/**
 * 3. HTML (.html) Export
 */
export function buildHtmlExport(doc: DocumentRecord): ExportResult {
  const { widthMm } = getPaperDimensionsMm(doc.pageSetup);
  const m = doc.pageSetup.marginsMm;
  const fontFamily = doc.editorStyle?.fontFamily || 'Plus Jakarta Sans';
  const fontSizePx = doc.editorStyle?.fontSizePx || 16;
  const lineHeight = doc.editorStyle?.lineHeight || 1.65;
  const pSpacingPx = doc.editorStyle?.paragraphSpacingPx ?? 10;

  let cleanBody = sanitizeHtml(doc.htmlCache || `<p>${escapeXml(doc.plainTextCache)}</p>`);
  // Enhance serialized ChartBlocks into visual inline SVG charts
  cleanBody = cleanBody.replace(
    /<div[^>]*data-notely-chart="true"[^>]*data-config="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
    (_m, encoded) => {
      try {
        const decoded = encoded
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        const cfg = JSON.parse(decoded) as ChartConfig;
        return renderChartSvgMarkup(cfg);
      } catch {
        return _m;
      }
    }
  );
  // Render page breaks & section breaks nicely in standalone HTML
  cleanBody = cleanBody
    .replace(
      /<div[^>]*data-notely-pagebreak="true"[^>]*>[\s\S]*?<\/div>/gi,
      '<hr style="border:none;border-top:2px dashed #D8D5E2;margin:24px 0;page-break-after:always;" />'
    )
    .replace(
      /<div[^>]*data-notely-sectionbreak="true"[^>]*>[\s\S]*?<\/div>/gi,
      '<hr style="border:none;border-top:3px double #8950F5;margin:24px 0;" />'
    );

  const footnotes = collectFootnotes(doc);
  const footnotesHtml = footnotes.length
    ? `<section style="margin-top:28px;padding-top:12px;border-top:1px solid #DFDCE8;font-size:13px;color:#5C5A68;"><strong>Footnotes</strong><ol style="padding-left:18px;margin-top:6px;">${footnotes
        .map((f) => `<li value="${f.number}">${escapeXml(f.text)}</li>`)
        .join('')}</ol></section>`
    : '';

  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeXml(doc.title)}</title>
  <style>
    body { font-family: '${escapeXml(fontFamily)}', system-ui, -apple-system, sans-serif; font-size: ${fontSizePx}px; line-height: ${lineHeight}; background: #F4F3F8; margin: 0; padding: 32px 16px; color: #24232B; }
    .page { max-width: ${widthMm}mm; margin: 0 auto; background: ${doc.pageSetup.pageColor || '#FFFFFF'}; padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); ${doc.pageSetup.showPageBorder ? `border: 1px solid ${doc.pageSetup.borderColor};` : ''} }
    header, footer { font-size: 12px; color: #716F7D; margin-bottom: 16px; text-align: ${doc.pageSetup.headerPosition}; }
    footer { margin-top: 24px; margin-bottom: 0; text-align: ${doc.pageSetup.footerPosition}; }
    h1.doc-title { font-size: 28px; margin: 0 0 18px 0; }
    .content p { margin: 0 0 ${pSpacingPx}px 0; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; }
    th, td { border: 1px solid #DFDCE8; padding: 8px 10px; text-align: left; }
    th { background: #F4F3F8; }
    img { max-width: 100%; border-radius: 8px; }
    blockquote { border-left: 3px solid #8950F5; padding-left: 12px; color: #555; }
  </style>
</head>
<body>
  <article class="page">
    ${doc.pageSetup.headerText ? `<header>${escapeXml(doc.pageSetup.headerText)}</header>` : ''}
    <h1 class="doc-title">${escapeXml(doc.title)}</h1>
    <div class="content">${cleanBody}</div>
    ${footnotesHtml}
    ${doc.pageSetup.footerText ? `<footer>${escapeXml(doc.pageSetup.footerText)}</footer>` : ''}
  </article>
</body>
</html>`;
  const bytes = new TextEncoder().encode(htmlDoc);
  return {
    blob: new Blob([bytes], { type: 'text/html;charset=utf-8' }),
    bytes,
    fileName: sanitizeFileName(doc.title, 'html'),
    mimeType: 'text/html',
    format: 'html',
  };
}

/**
 * 4. Rich Text Format (.rtf) Export
 */
function renderRtfInline(nodes: StructuredNode[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '\\line ';
      if (n.type === 'footnote') {
        return `\\super [${Number(n.attrs?.number ?? 1)}]\\nosupersub `;
      }
      if (typeof n.text !== 'string') return '';
      const txt = escapeRtf(n.text);
      const marks = n.marks ?? [];
      const prefix: string[] = [];
      const suffix: string[] = [];
      for (const m of marks) {
        if (m.type === 'bold') {
          prefix.push('\\b ');
          suffix.unshift('\\b0 ');
        } else if (m.type === 'italic') {
          prefix.push('\\i ');
          suffix.unshift('\\i0 ');
        } else if (m.type === 'underline') {
          prefix.push('\\ul ');
          suffix.unshift('\\ulnone ');
        } else if (m.type === 'strike') {
          prefix.push('\\strike ');
          suffix.unshift('\\strike0 ');
        }
      }
      return `${prefix.join('')}${txt}${suffix.join('')}`;
    })
    .join('');
}

export function buildRtfExport(doc: DocumentRecord): ExportResult {
  const parts: string[] = [
    '{\\rtf1\\ansi\\deff0',
    '{\\fonttbl{\\f0\\fnil\\fcharset0 Plus Jakarta Sans;}{\\f1\\fmodern\\fcharset0 Courier New;}}',
    '{\\colortbl;\\red36\\green35\\blue43;\\red137\\green80\\blue245;}',
    `\\pard\\sa200\\fs44\\b ${escapeRtf(doc.title)}\\b0\\par`,
  ];

  const nodes = doc.content?.content ?? [];
  for (const node of nodes) {
    if (node.type === 'heading') {
      const level = Number(node.attrs?.level ?? 1);
      const fs = Math.max(22, 40 - level * 4);
      parts.push(`\\pard\\sb160\\sa100\\fs${fs}\\b ${renderRtfInline(node.content)}\\b0\\par`);
    } else if (node.type === 'paragraph') {
      const align = node.attrs?.textAlign;
      const alignCmd =
        align === 'center' ? '\\qc' : align === 'right' ? '\\qr' : align === 'justify' ? '\\qj' : '\\ql';
      parts.push(`\\pard${alignCmd}\\sa120\\fs24 ${renderRtfInline(node.content)}\\par`);
    } else if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      const items = node.content ?? [];
      items.forEach((item, idx) => {
        const prefix =
          node.type === 'orderedList'
            ? `${idx + 1}. `
            : node.type === 'taskList'
              ? item.attrs?.checked
                ? '[x] '
                : '[ ] '
              : '\\bullet  ';
        const inner = (item.content ?? []).map((p) => renderRtfInline(p.content)).join(' ');
        parts.push(`\\pard\\li360\\sa80\\fs24 ${prefix}${inner}\\par`);
      });
    } else if (node.type === 'blockquote') {
      const inner = (node.content ?? []).map((p) => renderRtfInline(p.content)).join(' ');
      parts.push(`\\pard\\li480\\sa120\\i ${inner}\\i0\\par`);
    } else if (node.type === 'table') {
      const rows = node.content ?? [];
      for (const row of rows) {
        const cells = row.content ?? [];
        const rowText = cells
          .map((c) => (c.content ?? []).map((p) => renderRtfInline(p.content)).join(' '))
          .join('  |  ');
        parts.push(`\\pard\\sa60\\fs22 ${rowText}\\par`);
      }
    } else if (node.type === 'callout') {
      const lbl = escapeRtf(String(node.attrs?.label ?? 'Note Box'));
      const txt = escapeRtf(String(node.attrs?.text ?? ''));
      parts.push(`\\pard\\li240\\sa120\\fs24\\b [${lbl}] \\b0 ${txt}\\par`);
    } else if (node.type === 'equation') {
      parts.push(`\\pard\\sa100\\fs24\\i ${escapeRtf(String(node.attrs?.latex ?? ''))}\\i0\\par`);
    } else if (node.type === 'chart') {
      const cfg = node.attrs?.config as ChartConfig | undefined;
      const summary = cfg?.rows?.map((r) => `${r.label}: ${r.value}`).join(', ') ?? '';
      parts.push(
        `\\pard\\sa100\\fs24\\b Chart: ${escapeRtf(String(node.attrs?.title ?? 'Chart'))}\\b0 (${escapeRtf(summary)})\\par`
      );
    } else if (node.type === 'horizontalRule') {
      parts.push('\\pard\\sa120 ----------------------------------------\\par');
    } else if (node.type === 'pageBreak' || node.type === 'sectionBreak') {
      parts.push('\\page');
    }
  }

  const footnotes = collectFootnotes(doc);
  if (footnotes.length > 0) {
    parts.push('\\pard\\sb200\\sa80\\fs22\\b Footnotes\\b0\\par');
    for (const f of footnotes) {
      parts.push(`\\pard\\sa60\\fs20 [${f.number}] ${escapeRtf(f.text)}\\par`);
    }
  }

  parts.push('}');
  const rtf = parts.join('\n');
  const bytes = new TextEncoder().encode(rtf);
  return {
    blob: new Blob([bytes], { type: 'application/rtf;charset=utf-8' }),
    bytes,
    fileName: sanitizeFileName(doc.title, 'rtf'),
    mimeType: 'application/rtf',
    format: 'rtf',
  };
}

/**
 * 5. Genuine Microsoft Word (.docx) Export
 */
function buildDocxInlineChildren(
  nodes: StructuredNode[] = [],
  defaultFont?: string,
  defaultSizeHalfPts?: number
): Array<TextRun | ExternalHyperlink> {
  const children: Array<TextRun | ExternalHyperlink> = [];
  for (const n of nodes) {
    if (n.type === 'hardBreak') {
      children.push(new TextRun({ break: 1 }));
      continue;
    }
    if (n.type === 'footnote') {
      children.push(
        new TextRun({
          text: `[${Number(n.attrs?.number ?? 1)}]`,
          superScript: true,
          bold: true,
          color: '8950F5',
          font: defaultFont,
        })
      );
      continue;
    }
    if (typeof n.text !== 'string') continue;
    const marks = n.marks ?? [];
    const bold = marks.some((m) => m.type === 'bold');
    const italics = marks.some((m) => m.type === 'italic');
    const underline = marks.some((m) => m.type === 'underline') ? {} : undefined;
    const strike = marks.some((m) => m.type === 'strike');
    const colorMark = marks.find((m) => m.type === 'textStyle' && m.attrs?.color);
    const fontMark = marks.find((m) => m.type === 'textStyle' && m.attrs?.fontFamily);
    const highlightMark = marks.find((m) => m.type === 'highlight');
    const linkMark = marks.find((m) => m.type === 'link' && m.attrs?.href);

    const color = linkMark
      ? '2563EB'
      : colorMark?.attrs?.color
        ? String(colorMark.attrs.color).replace('#', '')
        : undefined;
    const shading = highlightMark?.attrs?.color
      ? {
          type: ShadingType.CLEAR,
          fill: String(highlightMark.attrs.color).replace('#', ''),
        }
      : undefined;
    const sub = marks.some((m) => m.type === 'subscript');
    const sup = marks.some((m) => m.type === 'superscript');

    const run = new TextRun({
      text: n.text,
      bold,
      italics,
      underline: linkMark ? {} : underline,
      strike,
      color,
      shading,
      font: fontMark?.attrs?.fontFamily ? String(fontMark.attrs.fontFamily) : defaultFont,
      size: defaultSizeHalfPts,
      subScript: sub,
      superScript: sup,
    });

    if (linkMark?.attrs?.href) {
      children.push(
        new ExternalHyperlink({
          link: String(linkMark.attrs.href),
          children: [run],
        })
      );
    } else {
      children.push(run);
    }
  }
  return children.length ? children : [new TextRun('')];
}

function mapDocxAlignment(align?: unknown) {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

export async function buildDocxExport(doc: DocumentRecord): Promise<ExportResult> {
  const defaultFont = doc.editorStyle?.fontFamily || 'Plus Jakarta Sans';
  const defaultSizeHalfPts = doc.editorStyle?.fontSizePx
    ? Math.round(doc.editorStyle.fontSizePx * 1.5)
    : 22;
  const pSpacingTwips = (doc.editorStyle?.paragraphSpacingPx ?? 8) * 15;

  const children: Array<DocxParagraph | DocxTable> = [
    new DocxParagraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: doc.title, bold: true, font: defaultFont })],
      spacing: { after: 240 },
    }),
  ];

  const nodes = doc.content?.content ?? [];
  for (const node of nodes) {
    if (node.type === 'heading') {
      const levelNum = Number(node.attrs?.level ?? 1);
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      children.push(
        new DocxParagraph({
          heading: headingMap[levelNum] ?? HeadingLevel.HEADING_1,
          alignment: mapDocxAlignment(node.attrs?.textAlign),
          children: buildDocxInlineChildren(node.content, defaultFont),
          spacing: { before: 180, after: 100 },
        })
      );
    } else if (node.type === 'paragraph') {
      children.push(
        new DocxParagraph({
          alignment: mapDocxAlignment(node.attrs?.textAlign),
          children: buildDocxInlineChildren(node.content, defaultFont, defaultSizeHalfPts),
          spacing: { after: Math.max(80, pSpacingTwips) },
        })
      );
    } else if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      (node.content ?? []).forEach((item, idx) => {
        const prefix =
          node.type === 'orderedList'
            ? `${idx + 1}. `
            : node.type === 'taskList'
              ? item.attrs?.checked
                ? '☑ '
                : '☐ '
              : '• ';
        const innerRuns = (item.content ?? []).flatMap((p) =>
          buildDocxInlineChildren(p.content, defaultFont, defaultSizeHalfPts)
        );
        children.push(
          new DocxParagraph({
            indent: { left: 420 },
            children: [new TextRun({ text: prefix, font: defaultFont }), ...innerRuns],
            spacing: { after: 80 },
          })
        );
      });
    } else if (node.type === 'blockquote') {
      const innerRuns = (node.content ?? []).flatMap((p) =>
        buildDocxInlineChildren(p.content, defaultFont, defaultSizeHalfPts)
      );
      children.push(
        new DocxParagraph({
          indent: { left: 540 },
          children: innerRuns,
          spacing: { before: 120, after: 120 },
        })
      );
    } else if (node.type === 'table') {
      const tableRows = (node.content ?? []).map(
        (row) =>
          new DocxTableRow({
            children: (row.content ?? []).map(
              (cell) =>
                new DocxTableCell({
                  children: (cell.content ?? []).map(
                    (p) =>
                      new DocxParagraph({
                        children: buildDocxInlineChildren(p.content, defaultFont, 20),
                      })
                  ),
                })
            ),
          })
      );
      if (tableRows.length > 0) {
        children.push(
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          })
        );
      }
    } else if ((node.type === 'image' || node.type === 'drawing') && typeof node.attrs?.src === 'string') {
      const imgBytes = dataUrlToUint8Array(node.attrs.src);
      if (imgBytes) {
        const imgType = detectDocxImageType(node.attrs.src);
        children.push(
          new DocxParagraph({
            children: [
              new ImageRun({
                data: imgBytes,
                transformation: { width: 420, height: 260 },
                type: imgType,
              }),
            ],
            spacing: { before: 120, after: 120 },
          })
        );
      }
    } else if (node.type === 'chart') {
      const cfg = node.attrs?.config as ChartConfig | undefined;
      children.push(
        new DocxParagraph({
          children: [
            new TextRun({
              text: `Chart: ${String(cfg?.title ?? node.attrs?.title ?? 'Chart')}`,
              bold: true,
              font: defaultFont,
            }),
          ],
          spacing: { before: 140, after: 60 },
        })
      );
      if (cfg?.rows?.length) {
        children.push(
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new DocxTableRow({
                children: [
                  new DocxTableCell({ children: [new DocxParagraph({ children: [new TextRun({ text: 'Label', bold: true })] })] }),
                  new DocxTableCell({ children: [new DocxParagraph({ children: [new TextRun({ text: 'Value', bold: true })] })] }),
                ],
              }),
              ...cfg.rows.map(
                (r) =>
                  new DocxTableRow({
                    children: [
                      new DocxTableCell({ children: [new DocxParagraph({ children: [new TextRun(r.label)] })] }),
                      new DocxTableCell({ children: [new DocxParagraph({ children: [new TextRun(String(r.value))] })] }),
                    ],
                  })
              ),
            ],
          })
        );
      }
    } else if (node.type === 'callout') {
      children.push(
        new DocxParagraph({
          indent: { left: 320 },
          shading: { type: ShadingType.CLEAR, fill: 'F0E9FF' },
          children: [
            new TextRun({ text: `${String(node.attrs?.label ?? 'Note')}: `, bold: true, color: '8950F5' }),
            new TextRun({ text: String(node.attrs?.text ?? ''), font: defaultFont }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
    } else if (node.type === 'toc') {
      const headings = extractHeadings(doc.content);
      children.push(
        new DocxParagraph({
          children: [new TextRun({ text: 'Table of Contents', bold: true, color: '8950F5' })],
          spacing: { before: 120, after: 60 },
        })
      );
      for (const h of headings) {
        children.push(
          new DocxParagraph({
            indent: { left: (h.level - 1) * 240 },
            children: [new TextRun({ text: h.text, font: defaultFont })],
            spacing: { after: 40 },
          })
        );
      }
    } else if (node.type === 'equation') {
      children.push(
        new DocxParagraph({
          children: [new TextRun({ text: String(node.attrs?.latex ?? ''), italics: true })],
          spacing: { after: 100 },
        })
      );
    } else if (node.type === 'pageBreak' || node.type === 'sectionBreak') {
      children.push(new DocxParagraph({ pageBreakBefore: true, children: [] }));
    } else if (node.type === 'horizontalRule') {
      children.push(new DocxParagraph({ children: [new TextRun('────────────────────────────────')], spacing: { after: 120 } }));
    }
  }

  const footnotes = collectFootnotes(doc);
  if (footnotes.length > 0) {
    children.push(
      new DocxParagraph({
        children: [new TextRun({ text: 'Footnotes', bold: true, size: 22 })],
        spacing: { before: 240, after: 80 },
      })
    );
    for (const f of footnotes) {
      children.push(
        new DocxParagraph({
          children: [new TextRun({ text: `[${f.number}] ${f.text}`, size: 18, color: '5C5A68' })],
          spacing: { after: 60 },
        })
      );
    }
  }

  const mmToTwip = (mm: number) => Math.round(mm * 56.6929);
  const dims = getPaperDimensionsMm(doc.pageSetup);
  const m = doc.pageSetup.marginsMm;

  const docx = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: mmToTwip(dims.widthMm),
              height: mmToTwip(dims.heightMm),
            },
            margin: {
              top: mmToTwip(m.top),
              right: mmToTwip(m.right),
              bottom: mmToTwip(m.bottom),
              left: mmToTwip(m.left),
            },
          },
        },
        headers: doc.pageSetup.headerText
          ? {
              default: new DocxHeader({
                children: [
                  new DocxParagraph({
                    alignment: mapDocxAlignment(doc.pageSetup.headerPosition),
                    children: [new TextRun({ text: doc.pageSetup.headerText, size: 18, color: '716F7D' })],
                  }),
                ],
              }),
            }
          : undefined,
        footers:
          doc.pageSetup.footerText || doc.pageSetup.showPageNumbers
            ? {
                default: new DocxFooter({
                  children: [
                    new DocxParagraph({
                      alignment: mapDocxAlignment(doc.pageSetup.footerPosition),
                      children: [
                        ...(doc.pageSetup.footerText
                          ? [new TextRun({ text: `${doc.pageSetup.footerText}  `, size: 18, color: '716F7D' })]
                          : []),
                        ...(doc.pageSetup.showPageNumbers
                          ? [new TextRun({ children: ['Page ', PageNumber.CURRENT], size: 18, color: '716F7D' })]
                          : []),
                      ],
                    }),
                  ],
                }),
              }
            : undefined,
        children,
      },
    ],
  });

  const base64 = await Packer.toBase64String(docx);
  const raw = dataUrlToUint8Array(`data:application/octet-stream;base64,${base64}`) ?? new Uint8Array();
  const copy = new Uint8Array(raw);
  return {
    blob: new Blob([copy], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    bytes: copy,
    fileName: sanitizeFileName(doc.title, 'docx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    format: 'docx',
  };
}

/**
 * 6. Genuine OpenDocument Text (.odt) Export
 */
export async function buildOdtExport(doc: DocumentRecord): Promise<ExportResult> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });

  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
  zip.folder('META-INF')?.file('manifest.xml', manifestXml);

  const dims = getPaperDimensionsMm(doc.pageSetup);
  const m = doc.pageSetup.marginsMm;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
  <office:automatic-styles>
    <style:page-layout style:name="pm1">
      <style:page-layout-properties fo:page-width="${dims.widthMm}mm" fo:page-height="${dims.heightMm}mm"
        fo:margin-top="${m.top}mm" fo:margin-bottom="${m.bottom}mm" fo:margin-left="${m.left}mm" fo:margin-right="${m.right}mm"
        style:print-orientation="${doc.pageSetup.orientation}"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm1"/>
  </office:master-styles>
</office:document-styles>`;
  zip.file('styles.xml', stylesXml);

  const bodyElements: string[] = [
    `<text:h text:outline-level="1">${escapeXml(doc.title)}</text:h>`,
  ];
  const nodes = doc.content?.content ?? [];
  for (const node of nodes) {
    if (node.type === 'heading') {
      const level = Number(node.attrs?.level ?? 1);
      bodyElements.push(
        `<text:h text:outline-level="${level}">${escapeXml(extractPlainText(node))}</text:h>`
      );
    } else if (node.type === 'paragraph' || node.type === 'blockquote') {
      bodyElements.push(`<text:p>${escapeXml(extractPlainText(node))}</text:p>`);
    } else if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      const listItems = (node.content ?? [])
        .map((item) => `<text:list-item><text:p>${escapeXml(extractPlainText(item))}</text:p></text:list-item>`)
        .join('');
      bodyElements.push(`<text:list>${listItems}</text:list>`);
    } else if (node.type === 'table') {
      const rowsXml = (node.content ?? [])
        .map((row) => {
          const cellsXml = (row.content ?? [])
            .map((cell) => `<table:table-cell><text:p>${escapeXml(extractPlainText(cell))}</text:p></table:table-cell>`)
            .join('');
          return `<table:table-row>${cellsXml}</table:table-row>`;
        })
        .join('');
      bodyElements.push(`<table:table>${rowsXml}</table:table>`);
    } else if (node.type === 'callout') {
      bodyElements.push(
        `<text:p>[${escapeXml(String(node.attrs?.label ?? 'Note'))}] ${escapeXml(String(node.attrs?.text ?? ''))}</text:p>`
      );
    } else if (node.type === 'equation') {
      bodyElements.push(`<text:p>${escapeXml(String(node.attrs?.latex ?? ''))}</text:p>`);
    } else if (node.type === 'chart') {
      const cfg = node.attrs?.config as ChartConfig | undefined;
      const summary = cfg?.rows?.map((r) => `${r.label}: ${r.value}`).join(', ') ?? '';
      bodyElements.push(
        `<text:p>Chart: ${escapeXml(String(node.attrs?.title ?? 'Chart'))} (${escapeXml(summary)})</text:p>`
      );
    } else if (node.type === 'horizontalRule') {
      bodyElements.push('<text:p>--------------------------------</text:p>');
    }
  }

  const footnotes = collectFootnotes(doc);
  if (footnotes.length > 0) {
    bodyElements.push('<text:h text:outline-level="3">Footnotes</text:h>');
    for (const f of footnotes) {
      bodyElements.push(`<text:p>[${f.number}] ${escapeXml(f.text)}</text:p>`);
    }
  }

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  office:version="1.2">
  <office:body>
    <office:text>
      ${bodyElements.join('\n      ')}
    </office:text>
  </office:body>
</office:document-content>`;
  zip.file('content.xml', contentXml);

  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return {
    blob: new Blob([new Uint8Array(bytes)], { type: 'application/vnd.oasis.opendocument.text' }),
    bytes,
    fileName: sanitizeFileName(doc.title, 'odt'),
    mimeType: 'application/vnd.oasis.opendocument.text',
    format: 'odt',
  };
}

/**
 * Helper: detect non-WinAnsi Unicode (e.g. Bengali, Hindi, Arabic, Math symbols)
 */
function hasNonWinAnsi(text: string): boolean {
  return /[^\x00-\xFF]/.test(text);
}

/**
 * Helper: rasterize Unicode text lines cleanly onto an offscreen canvas PNG for jsPDF
 * when running in Chromium/WebView so Bengali & math symbols render accurately.
 */
function renderUnicodeBlockToPng(
  text: string,
  options: {
    fontSizePt: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    maxWidthMm: number;
    align?: 'left' | 'center' | 'right';
  }
): { dataUrl: string; widthMm: number; heightMm: number } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const pxPerMm = 8; // ~203 DPI crisp print rendering
  const maxWidthPx = Math.max(80, Math.round(options.maxWidthMm * pxPerMm));
  const fontPx = Math.round(options.fontSizePt * 0.352778 * pxPerMm * 1.15);
  const weight = options.bold ? '700' : '400';
  const style = options.italic ? 'italic' : 'normal';
  const fontStr = `${style} ${weight} ${fontPx}px 'Noto Sans Bengali', 'Noto Sans', 'Plus Jakarta Sans', system-ui, sans-serif`;
  ctx.font = fontStr;

  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current + w;
    if (current && ctx.measureText(candidate).width > maxWidthPx) {
      lines.push(current.trimEnd());
      current = w.trimStart();
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length === 0) lines.push('');

  const lineHeightPx = Math.round(fontPx * 1.45);
  canvas.width = maxWidthPx;
  canvas.height = Math.max(lineHeightPx, lines.length * lineHeightPx + 4);

  const ctx2 = canvas.getContext('2d');
  if (!ctx2) return null;
  ctx2.font = fontStr;
  ctx2.fillStyle = options.color || '#24232B';
  ctx2.textBaseline = 'top';
  lines.forEach((line, idx) => {
    const lineW = ctx2.measureText(line).width;
    const x =
      options.align === 'center'
        ? Math.max(0, (maxWidthPx - lineW) / 2)
        : options.align === 'right'
          ? Math.max(0, maxWidthPx - lineW)
          : 0;
    ctx2.fillText(line, x, idx * lineHeightPx + 2);
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthMm: canvas.width / pxPerMm,
    heightMm: canvas.height / pxPerMm,
  };
}

/**
 * Helper: Draw vector chart directly via jsPDF primitives (works identically in Browser + Node)
 */
function drawPdfChart(
  pdf: jsPDF,
  config: ChartConfig,
  x: number,
  y: number,
  widthMm: number
): number {
  const rows = config.rows?.length ? config.rows : [{ label: 'Item', value: 50 }];
  const chartHeight = 52;
  pdf.setDrawColor('#ECEAF1');
  pdf.setFillColor('#FBFBFD');
  pdf.roundedRect(x, y, widthMm, chartHeight, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor('#24232B');
  pdf.text(String(config.title || 'Data Chart'), x + 4, y + 6.5);

  const plotX = x + 6;
  const plotY = y + 12;
  const plotW = widthMm - 12;
  const plotH = 30;
  const maxVal = Math.max(1, ...rows.map((r) => Number(r.value) || 0));

  if (config.chartType === 'pie' || config.chartType === 'doughnut') {
    const total = Math.max(1, rows.reduce((s, r) => s + Math.max(0, Number(r.value) || 0), 0));
    rows.forEach((row, idx) => {
      const color = row.color || CHART_PALETTE[idx % CHART_PALETTE.length];
      const ly = plotY + idx * 5.5;
      if (ly < y + chartHeight - 4) {
        pdf.setFillColor(color);
        pdf.circle(plotX + 3, ly, 1.8, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor('#24232B');
        const pct = Math.round(((Math.max(0, Number(row.value) || 0) / total) * 100));
        pdf.text(`${row.label}: ${row.value} (${pct}%)`, plotX + 7, ly + 1);
      }
    });
  } else {
    pdf.setDrawColor('#D8D5E2');
    pdf.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

    if (config.chartType === 'bar') {
      const slotW = plotW / rows.length;
      const barW = Math.min(14, slotW * 0.6);
      rows.forEach((row, idx) => {
        const h = (Math.max(0, Number(row.value) || 0) / maxVal) * (plotH - 4);
        const bx = plotX + idx * slotW + (slotW - barW) / 2;
        const by = plotY + plotH - h;
        pdf.setFillColor(row.color || CHART_PALETTE[idx % CHART_PALETTE.length]);
        pdf.rect(bx, by, barW, Math.max(1.5, h), 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor('#5C5A68');
        pdf.text(String(row.value), bx + barW / 2, by - 1.5, { align: 'center' });
        pdf.text(row.label.slice(0, 8), bx + barW / 2, plotY + plotH + 4.5, { align: 'center' });
      });
    } else {
      const pts = rows.map((row, idx) => ({
        px: plotX + (idx * plotW) / Math.max(1, rows.length - 1),
        py: plotY + plotH - (Math.max(0, Number(row.value) || 0) / maxVal) * (plotH - 4),
        row,
      }));
      pdf.setDrawColor('#8950F5');
      pdf.setLineWidth(0.6);
      for (let i = 1; i < pts.length; i++) {
        pdf.line(pts[i - 1].px, pts[i - 1].py, pts[i].px, pts[i].py);
      }
      pts.forEach((p) => {
        pdf.setFillColor('#8950F5');
        pdf.circle(p.px, p.py, 1.3, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor('#5C5A68');
        pdf.text(String(p.row.value), p.px, p.py - 2, { align: 'center' });
        pdf.text(p.row.label.slice(0, 8), p.px, plotY + plotH + 4.5, { align: 'center' });
      });
    }
  }
  return chartHeight;
}

/**
 * 7. Genuine PDF (.pdf) Export respecting Page Setup, Headings, Formatting, Tables, Charts & Unicode
 */
export function buildPdfExport(doc: DocumentRecord): ExportResult {
  const dims = getPaperDimensionsMm(doc.pageSetup);
  const orientation = doc.pageSetup.orientation === 'landscape' ? 'l' : 'p';
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [dims.widthMm, dims.heightMm],
  });

  const m = doc.pageSetup.marginsMm;
  const contentWidth = Math.max(40, dims.widthMm - m.left - m.right);
  const pageHeight = dims.heightMm;
  const baseFontSizePt = Math.max(9, Math.min(18, (doc.editorStyle?.fontSizePx || 16) * 0.68));
  const pGapMm = Math.max(2, (doc.editorStyle?.paragraphSpacingPx ?? 10) * 0.28);

  const paintPageChrome = (pageNum: number) => {
    if (doc.pageSetup.pageColor && doc.pageSetup.pageColor.toUpperCase() !== '#FFFFFF') {
      pdf.setFillColor(doc.pageSetup.pageColor);
      pdf.rect(0, 0, dims.widthMm, dims.heightMm, 'F');
    }
    if (doc.pageSetup.showPageBorder) {
      pdf.setDrawColor(doc.pageSetup.borderColor || '#D4D0E0');
      pdf.setLineWidth(0.4);
      pdf.rect(8, 8, dims.widthMm - 16, dims.heightMm - 16);
    }
    if (doc.pageSetup.headerText && !(doc.pageSetup.differentFirstPage && pageNum === 1)) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor('#716F7D');
      const align = doc.pageSetup.headerPosition;
      const x =
        align === 'left' ? m.left : align === 'right' ? dims.widthMm - m.right : dims.widthMm / 2;
      pdf.text(doc.pageSetup.headerText, x, Math.max(10, m.top - 8), { align });
    }
    if (doc.pageSetup.footerText || doc.pageSetup.showPageNumbers) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor('#716F7D');
      const footerParts: string[] = [];
      if (doc.pageSetup.footerText) footerParts.push(doc.pageSetup.footerText);
      if (doc.pageSetup.showPageNumbers) footerParts.push(`Page ${pageNum}`);
      const align = doc.pageSetup.footerPosition;
      const x =
        align === 'left' ? m.left : align === 'right' ? dims.widthMm - m.right : dims.widthMm / 2;
      pdf.text(footerParts.join(' · '), x, pageHeight - Math.max(8, m.bottom - 10), { align });
    }
    if (doc.pageSetup.watermarkText) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(34);
      pdf.setTextColor('#E8E6F0');
      pdf.text(doc.pageSetup.watermarkText, dims.widthMm / 2, dims.heightMm / 2, {
        align: 'center',
        angle: 35,
      });
    }
    pdf.setTextColor('#24232B');
  };

  let pageNumber = 1;
  paintPageChrome(pageNumber);
  let y = m.top;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - m.bottom) {
      pdf.addPage([dims.widthMm, dims.heightMm], orientation);
      pageNumber += 1;
      paintPageChrome(pageNumber);
      y = m.top;
    }
  };

  const renderSmartText = (
    text: string,
    opts: {
      x: number;
      maxWidth: number;
      fontSizePt: number;
      bold?: boolean;
      italic?: boolean;
      color?: string;
      highlight?: string;
      align?: 'left' | 'center' | 'right';
      lineStepMm?: number;
    }
  ) => {
    if (hasNonWinAnsi(text)) {
      const png = renderUnicodeBlockToPng(text, {
        fontSizePt: opts.fontSizePt,
        bold: opts.bold,
        italic: opts.italic,
        color: opts.color,
        maxWidthMm: opts.maxWidth,
        align: opts.align,
      });
      if (png) {
        ensureSpace(png.heightMm + 2);
        pdf.addImage(png.dataUrl, 'PNG', opts.x, y - 3.5, png.widthMm, png.heightMm);
        y += png.heightMm + 2;
        return;
      }
    }

    const style =
      opts.bold && opts.italic ? 'bolditalic' : opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal';
    pdf.setFont('helvetica', style);
    pdf.setFontSize(opts.fontSizePt);
    pdf.setTextColor(opts.color || '#24232B');
    const lines = pdf.splitTextToSize(text, opts.maxWidth);
    const step = opts.lineStepMm ?? opts.fontSizePt * 0.48;
    ensureSpace(lines.length * step + 2);
    if (opts.highlight) {
      pdf.setFillColor(opts.highlight);
      pdf.rect(opts.x - 1, y - 3.5, Math.min(opts.maxWidth, text.length * 2.1 + 4), lines.length * step, 'F');
    }
    const drawX =
      opts.align === 'center'
        ? opts.x + opts.maxWidth / 2
        : opts.align === 'right'
          ? opts.x + opts.maxWidth
          : opts.x;
    pdf.text(lines, drawX, y, {
      align: opts.align === 'center' || opts.align === 'right' ? opts.align : 'left',
    });
    y += lines.length * step + 2;
  };

  // Title
  renderSmartText(doc.title || 'Untitled Note', {
    x: m.left,
    maxWidth: contentWidth,
    fontSizePt: 21,
    bold: true,
    lineStepMm: 8.5,
  });
  y += 3;

  const nodes = doc.content?.content ?? [];
  for (const node of nodes) {
    if (node.type === 'pageBreak' || node.type === 'sectionBreak') {
      pdf.addPage([dims.widthMm, dims.heightMm], orientation);
      pageNumber += 1;
      paintPageChrome(pageNumber);
      y = m.top;
      continue;
    }

    if (node.type === 'horizontalRule') {
      ensureSpace(8);
      pdf.setDrawColor('#DFDCE8');
      pdf.setLineWidth(0.3);
      pdf.line(m.left, y + 2, m.left + contentWidth, y + 2);
      y += 7;
      continue;
    }

    if (node.type === 'heading') {
      const level = Number(node.attrs?.level ?? 1);
      const fontSize = Math.max(12, 20 - level * 2);
      const text = extractPlainText(node);
      if (!text) continue;
      renderSmartText(text, {
        x: m.left,
        maxWidth: contentWidth,
        fontSizePt: fontSize,
        bold: true,
      });
      y += 1.5;
      continue;
    }

    if (node.type === 'paragraph' || node.type === 'blockquote') {
      const text = extractPlainText(node);
      if (!text) {
        y += 4;
        continue;
      }
      const hasBold = (node.content ?? []).some((c) => c.marks?.some((mk) => mk.type === 'bold'));
      const hasItalic = (node.content ?? []).some((c) => c.marks?.some((mk) => mk.type === 'italic'));
      const colorMark = (node.content ?? []).find((c) =>
        c.marks?.some((mk) => mk.type === 'textStyle' && mk.attrs?.color)
      );
      const color = colorMark?.marks?.find((mk) => mk.type === 'textStyle')?.attrs?.color as string | undefined;
      const hlMark = (node.content ?? []).find((c) => c.marks?.some((mk) => mk.type === 'highlight'));
      const highlight = hlMark?.marks?.find((mk) => mk.type === 'highlight')?.attrs?.color as string | undefined;

      const indent = node.type === 'blockquote' ? 6 : 0;
      const startY = y;
      const align = (node.attrs?.textAlign as 'left' | 'center' | 'right' | undefined) ?? 'left';
      renderSmartText(text, {
        x: m.left + indent,
        maxWidth: contentWidth - indent,
        fontSizePt: baseFontSizePt,
        bold: hasBold,
        italic: hasItalic || node.type === 'blockquote',
        color,
        highlight,
        align,
      });
      if (node.type === 'blockquote') {
        pdf.setDrawColor('#8950F5');
        pdf.setLineWidth(0.8);
        pdf.line(m.left + 1.5, startY - 3, m.left + 1.5, y - 3);
      }
      y += pGapMm;
      continue;
    }

    if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      (node.content ?? []).forEach((item, idx) => {
        const prefix =
          node.type === 'orderedList'
            ? `${idx + 1}.`
            : node.type === 'taskList'
              ? item.attrs?.checked
                ? '[x]'
                : '[ ]'
              : '-';
        const text = `${prefix} ${extractPlainText(item)}`;
        renderSmartText(text, {
          x: m.left + 4,
          maxWidth: contentWidth - 6,
          fontSizePt: baseFontSizePt,
        });
      });
      y += 2;
      continue;
    }

    if (node.type === 'table') {
      const rows = node.content ?? [];
      for (let r = 0; r < rows.length; r++) {
        const cells = rows[r].content ?? [];
        const colW = contentWidth / Math.max(1, cells.length);
        const cellTexts = cells.map((c) => pdf.splitTextToSize(extractPlainText(c) || ' ', colW - 4));
        const maxLines = Math.max(1, ...cellTexts.map((l) => l.length));
        const rowH = maxLines * 5 + 4;
        ensureSpace(rowH + 1);
        cells.forEach((_, cIdx) => {
          const cx = m.left + cIdx * colW;
          if (r === 0) {
            pdf.setFillColor('#F4F3F8');
            pdf.rect(cx, y - 4, colW, rowH, 'FD');
            pdf.setFont('helvetica', 'bold');
          } else {
            pdf.setDrawColor('#DFDCE8');
            pdf.rect(cx, y - 4, colW, rowH, 'D');
            pdf.setFont('helvetica', 'normal');
          }
          pdf.setFontSize(10);
          pdf.setTextColor('#24232B');
          pdf.text(cellTexts[cIdx], cx + 2, y);
        });
        y += rowH;
      }
      y += 4;
      continue;
    }

    if ((node.type === 'image' || node.type === 'drawing') && typeof node.attrs?.src === 'string') {
      const src = node.attrs.src;
      if (src.startsWith('data:image/')) {
        const imgH = 55;
        ensureSpace(imgH + 6);
        try {
          const fmt = src.includes('image/jpeg') ? 'JPEG' : 'PNG';
          pdf.addImage(src, fmt, m.left, y, Math.min(contentWidth, 110), imgH);
          y += imgH + 5;
        } catch {
          renderSmartText('[Embedded visual]', { x: m.left, maxWidth: contentWidth, fontSizePt: 10 });
        }
      }
      continue;
    }

    if (node.type === 'chart') {
      const cfg = (node.attrs?.config as ChartConfig | undefined) ?? {
        chartType: 'bar',
        title: String(node.attrs?.title ?? 'Chart'),
        rows: [{ label: 'Data', value: 50 }],
        palette: 'purple',
      };
      ensureSpace(56);
      const usedH = drawPdfChart(pdf, cfg, m.left, y, contentWidth);
      y += usedH + 5;
      continue;
    }

    if (node.type === 'toc') {
      const headings = extractHeadings(doc.content);
      renderSmartText('Table of Contents', {
        x: m.left,
        maxWidth: contentWidth,
        fontSizePt: 12,
        bold: true,
        color: '#8950F5',
      });
      for (const h of headings) {
        renderSmartText(`${'  '.repeat(h.level - 1)}${h.text}`, {
          x: m.left + 2,
          maxWidth: contentWidth - 4,
          fontSizePt: 10,
        });
      }
      y += 2;
      continue;
    }

    if (node.type === 'equation' || node.type === 'callout') {
      const label =
        node.type === 'equation'
          ? `Equation: ${String(node.attrs?.latex ?? '')}`
          : `${String(node.attrs?.label ?? 'Note')}: ${String(node.attrs?.text ?? '')}`;
      renderSmartText(label, {
        x: m.left + 2,
        maxWidth: contentWidth - 4,
        fontSizePt: 10,
        italic: true,
      });
    }
  }

  const footnotes = collectFootnotes(doc);
  if (footnotes.length > 0) {
    ensureSpace(16);
    pdf.setDrawColor('#DFDCE8');
    pdf.line(m.left, y, m.left + 50, y);
    y += 5;
    renderSmartText('Footnotes', {
      x: m.left,
      maxWidth: contentWidth,
      fontSizePt: 10,
      bold: true,
      color: '#5C5A68',
    });
    for (const f of footnotes) {
      renderSmartText(`[${f.number}] ${f.text}`, {
        x: m.left,
        maxWidth: contentWidth,
        fontSizePt: 9,
        color: '#5C5A68',
      });
    }
  }

  const arrayBuffer = pdf.output('arraybuffer');
  const bytes = new Uint8Array(arrayBuffer);
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    bytes,
    fileName: sanitizeFileName(doc.title, 'pdf'),
    mimeType: 'application/pdf',
    format: 'pdf',
  };
}

export async function generateExport(
  doc: DocumentRecord,
  format: ExportFormat
): Promise<ExportResult> {
  switch (format) {
    case 'txt':
      return buildTxtExport(doc);
    case 'md':
      return buildMarkdownExport(doc);
    case 'html':
      return buildHtmlExport(doc);
    case 'rtf':
      return buildRtfExport(doc);
    case 'docx':
      return buildDocxExport(doc);
    case 'odt':
      return buildOdtExport(doc);
    case 'pdf':
      return buildPdfExport(doc);
  }
}

export function triggerFileDownload(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareExportedFile(
  doc: DocumentRecord,
  format: ExportFormat
): Promise<'shared' | 'downloaded'> {
  const res = await generateExport(doc, format);
  const file = new File([res.blob], res.fileName, { type: res.mimeType });
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title: doc.title,
      text: `${doc.title} — exported from Notely`,
      files: [file],
    });
    return 'shared';
  }
  triggerFileDownload(res);
  return 'downloaded';
}

/**
 * File Import Engine (DOCX, ODT, RTF, HTML, Markdown, TXT, PDF stream decompression + text extraction)
 */
export interface ImportedDocumentData {
  title: string;
  html: string;
  plainText: string;
  sourceFormat: string;
}

export function parseRtfToHtml(rtf: string): string {
  const stripped = rtf
    .replace(/\{\\\*\\[^}]+\}/g, '')
    .replace(/\{\\fonttbl[^}]*\}/g, '')
    .replace(/\{\\colortbl[^}]*\}/g, '')
    .replace(/\{\\stylesheet[^}]*\}/g, '')
    .replace(/\\par\b/g, '\n')
    .replace(/\\line\b/g, '\n')
    .replace(/\\tab\b/g, '  ')
    .replace(/\\[a-z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .trim();
  const paragraphs = stripped
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.map((p) => `<p>${escapeXml(p)}</p>`).join('') || '<p></p>';
}

async function inflatePdfFlateStreams(bytes: Uint8Array): Promise<string> {
  const raw = new TextDecoder('latin1').decode(bytes);
  const parts: string[] = [raw];

  if (typeof DecompressionStream !== 'undefined') {
    let cursor = 0;
    while (cursor < raw.length) {
      const startMarker = raw.indexOf('stream', cursor);
      if (startMarker === -1) break;
      let dataStart = startMarker + 6;
      if (raw[dataStart] === '\r' && raw[dataStart + 1] === '\n') dataStart += 2;
      else if (raw[dataStart] === '\n' || raw[dataStart] === '\r') dataStart += 1;

      const endMarker = raw.indexOf('endstream', dataStart);
      if (endMarker === -1) break;
      cursor = endMarker + 9;

      let dataEnd = endMarker;
      while (dataEnd > dataStart && (raw[dataEnd - 1] === '\n' || raw[dataEnd - 1] === '\r')) {
        dataEnd--;
      }
      if (dataEnd <= dataStart) continue;

      const slice = bytes.slice(dataStart, dataEnd);
      // Only attempt zlib inflate on streams that start with a valid zlib CMF byte (0x78)
      if (slice.length < 4 || slice[0] !== 0x78) continue;
      try {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        const readPromise = new Response(ds.readable).arrayBuffer().catch(() => null);
        await writer.write(slice).catch(() => {});
        await writer.close().catch(() => {});
        const inflated = await readPromise;
        if (inflated && inflated.byteLength > 0) {
          parts.push(new TextDecoder('latin1').decode(new Uint8Array(inflated)));
        }
      } catch {
        // Ignore non-deflate or malformed streams
      }
    }
  }
  return parts.join('\n');
}

export async function importDocumentFile(file: File): Promise<ImportedDocumentData> {
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const baseTitle = name.replace(/\.[^.]+$/, '') || 'Imported Note';

  if (ext === 'txt') {
    const text = await file.text();
    const html = text
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeXml(p).replace(/\n/g, '<br/>')}</p>`)
      .join('');
    return { title: baseTitle, html: html || '<p></p>', plainText: text, sourceFormat: 'TXT' };
  }

  if (ext === 'md' || ext === 'markdown') {
    const text = await file.text();
    const html = sanitizeHtml(await marked.parse(text));
    return { title: baseTitle, html, plainText: text, sourceFormat: 'Markdown' };
  }

  if (ext === 'html' || ext === 'htm') {
    const raw = await file.text();
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const html = sanitizeHtml(bodyMatch ? bodyMatch[1] : raw);
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      title: titleMatch?.[1]?.trim() || baseTitle,
      html,
      plainText,
      sourceFormat: 'HTML',
    };
  }

  if (ext === 'rtf') {
    const raw = await file.text();
    if (!raw.includes('{\\rtf')) {
      throw new Error('The selected RTF file appears to be invalid or corrupted.');
    }
    const html = parseRtfToHtml(raw);
    const plainText = html.replace(/<[^>]+>/g, '\n').trim();
    return { title: baseTitle, html, plainText, sourceFormat: 'RTF' };
  }

  if (ext === 'docx') {
    const buffer = await file.arrayBuffer();
    const mammothMod = await import('mammoth');
    const result = await mammothMod.convertToHtml({ arrayBuffer: buffer });
    const html = sanitizeHtml(result.value || '<p></p>');
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { title: baseTitle, html, plainText, sourceFormat: 'DOCX' };
  }

  if (ext === 'odt') {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const contentFile = zip.file('content.xml');
    if (!contentFile) {
      throw new Error('Invalid ODT archive: content.xml missing.');
    }
    const xml = await contentFile.async('string');
    const paragraphs: string[] = [];
    const tagRegex = /<text:(?:p|h)[^>]*>([\s\S]*?)<\/text:(?:p|h)>/g;
    let m: RegExpExecArray | null;
    while ((m = tagRegex.exec(xml)) !== null) {
      const inner = m[1].replace(/<[^>]+>/g, '').trim();
      if (inner) paragraphs.push(`<p>${escapeXml(inner)}</p>`);
    }
    const html = paragraphs.join('') || '<p></p>';
    const plainText = paragraphs.map((p) => p.replace(/<[^>]+>/g, '')).join('\n');
    return { title: baseTitle, html, plainText, sourceFormat: 'ODT' };
  }

  if (ext === 'pdf') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const header = new TextDecoder('latin1').decode(bytes.slice(0, 8));
    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid PDF file header.');
    }
    const combinedStreams = await inflatePdfFlateStreams(bytes);
    const textChunks: string[] = [];
    const literalRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let m: RegExpExecArray | null;
    while ((m = literalRegex.exec(combinedStreams)) !== null) {
      const unescaped = m[1]
        .replace(/\\([()\\])/g, '$1')
        .replace(/[^\x20-\x7E]/g, ' ')
        .trim();
      if (unescaped) textChunks.push(unescaped);
    }
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((m = tjArrayRegex.exec(combinedStreams)) !== null) {
      const inner = m[1].match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g);
      if (inner) {
        const joined = inner
          .map((tok) => tok.slice(1, -1).replace(/\\([()\\])/g, '$1'))
          .join('')
          .replace(/[^\x20-\x7E]/g, ' ')
          .trim();
        if (joined) textChunks.push(joined);
      }
    }
    const extracted = textChunks.join(' ').replace(/\s+/g, ' ').trim();
    const html = extracted
      ? `<p>${escapeXml(extracted)}</p>`
      : `<p>Imported PDF document: <strong>${escapeXml(file.name)}</strong> (${Math.round(file.size / 1024)} KB). PDF uses compressed streams; paste or attach additional notes below.</p>`;
    return {
      title: baseTitle,
      html,
      plainText: extracted || file.name,
      sourceFormat: 'PDF',
    };
  }

  throw new Error(`Unsupported file format ".${ext}". Supported: DOCX, PDF, TXT, RTF, HTML, MD, ODT.`);
}
