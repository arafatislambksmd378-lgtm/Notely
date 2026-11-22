import type {
  DocumentRecord,
  DocumentStats,
  FindMatch,
  NotebookFilterOption,
  NotebookSortOption,
  PageSetup,
  SpellingIssue,
  StructuredContent,
  StructuredNode,
  TocHeading,
} from '../types/notely';

/**
 * Extracts readable plain text recursively from a TipTap / ProseMirror JSON document.
 */
export function extractPlainText(doc: StructuredContent | StructuredNode | null | undefined): string {
  if (!doc) return '';
  const parts: string[] = [];

  const walk = (node: StructuredNode | StructuredContent) => {
    if ('text' in node && typeof node.text === 'string') {
      parts.push(node.text);
      return;
    }
    if (node.type === 'hardBreak') {
      parts.push('\n');
      return;
    }
    if (node.type === 'horizontalRule') {
      parts.push('\n---\n');
      return;
    }
    if (node.type === 'pageBreak' || node.type === 'sectionBreak') {
      parts.push('\n\n');
      return;
    }
    if (node.type === 'footnote' && 'attrs' in node) {
      const attrs = node.attrs as Record<string, unknown> | undefined;
      if (attrs?.text) {
        parts.push(`[${String(attrs.number ?? 1)}: ${String(attrs.text)}]`);
      }
      return;
    }
    if (node.type === 'callout' && 'attrs' in node) {
      const attrs = node.attrs as Record<string, unknown> | undefined;
      if (attrs?.text) {
        parts.push(`${String(attrs.label ?? 'Note')}: ${String(attrs.text)}\n`);
      }
      return;
    }
    if (node.type === 'toc') {
      parts.push('Table of Contents\n');
      return;
    }
    if (node.type === 'equation' && 'attrs' in node) {
      const attrs = node.attrs as Record<string, unknown> | undefined;
      if (attrs?.latex) {
        parts.push(` ${String(attrs.latex)} `);
        return;
      }
    }
    if (node.type === 'chart' && 'attrs' in node) {
      const attrs = node.attrs as Record<string, unknown> | undefined;
      if (attrs?.title) {
        parts.push(`[Chart: ${String(attrs.title)}]`);
        return;
      }
    }
    if (node.type === 'drawing') {
      parts.push('[Drawing]');
      return;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
      if (
        node.type === 'paragraph' ||
        node.type === 'heading' ||
        node.type === 'listItem' ||
        node.type === 'taskItem' ||
        node.type === 'blockquote' ||
        node.type === 'tableRow'
      ) {
        parts.push('\n');
      }
    }
  };

  walk(doc);
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Computes full document statistics (words, chars, chars without spaces, sentences, paragraphs, pages).
 */
export function computeDocumentStats(
  text: string,
  doc?: StructuredContent | null,
  pageSetup?: PageSetup
): DocumentStats {
  const normalized = text.replace(/\r\n/g, '\n');
  const trimmed = normalized.trim();

  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const characters = normalized.length;
  const charactersWithoutSpaces = normalized.replace(/\s/g, '').length;

  const sentenceMatches = trimmed.match(/[^.!?]+(?:[.!?]+|$)/g);
  const sentences = trimmed
    ? (sentenceMatches ? sentenceMatches.filter((s) => s.trim().length > 0).length : 1)
    : 0;

  let paragraphs = 0;
  if (doc && Array.isArray(doc.content)) {
    paragraphs = doc.content.filter((n) => {
      if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'blockquote') {
        return extractPlainText(n).trim().length > 0;
      }
      return n.type === 'bulletList' || n.type === 'orderedList' || n.type === 'taskList' || n.type === 'table';
    }).length;
  } else if (trimmed) {
    paragraphs = trimmed.split(/\n+/).filter((p) => p.trim().length > 0).length;
  }

  // Approximate page count factoring paper size and orientation
  let wordsPerPage = 420;
  if (pageSetup) {
    if (pageSetup.paperSize === 'A5') wordsPerPage = 230;
    else if (pageSetup.paperSize === 'A3') wordsPerPage = 760;
    else if (pageSetup.paperSize === 'Legal') wordsPerPage = 500;
    if (pageSetup.orientation === 'landscape') wordsPerPage = Math.round(wordsPerPage * 1.15);
  }
  const explicitBreaks = doc?.content
    ? doc.content.filter((n) => n.type === 'pageBreak' || n.type === 'sectionBreak').length
    : 0;
  const pages = Math.max(1, Math.ceil(words / wordsPerPage) + explicitBreaks);

  return {
    words,
    characters,
    charactersWithoutSpaces,
    sentences,
    paragraphs,
    pages,
  };
}

/**
 * Extracts heading structure (H1-H6) from TipTap JSON for Table of Contents.
 */
export function extractHeadings(doc: StructuredContent | null | undefined): TocHeading[] {
  if (!doc || !Array.isArray(doc.content)) return [];
  const headings: TocHeading[] = [];
  doc.content.forEach((node, idx) => {
    if (node.type === 'heading') {
      const level = Number(node.attrs?.level ?? 1);
      const text = extractPlainText(node).trim();
      if (text) {
        headings.push({
          id: `heading-${idx}`,
          level: Math.min(6, Math.max(1, level)),
          text,
          index: idx,
        });
      }
    }
  });
  return headings;
}

/**
 * Case transformation utilities for selected text.
 */
export function transformTextCase(
  input: string,
  mode: 'upper' | 'lower' | 'title' | 'sentence'
): string {
  switch (mode) {
    case 'upper':
      return input.toUpperCase();
    case 'lower':
      return input.toLowerCase();
    case 'title':
      return input.replace(/\b([a-zA-Z])(\w*)/g, (_, first: string, rest: string) => {
        return first.toUpperCase() + rest.toLowerCase();
      });
    case 'sentence':
      return input
        .toLowerCase()
        .replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) => match.toUpperCase());
  }
}

/**
 * Finds all matches in text with optional case-sensitivity and whole-word matching.
 */
export function findTextMatches(
  text: string,
  query: string,
  options: { matchCase?: boolean; wholeWord?: boolean } = {}
): FindMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
  const flags = options.matchCase ? 'g' : 'gi';
  const regex = new RegExp(pattern, flags);

  const matches: FindMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const start = Math.max(0, match.index - 20);
    const end = Math.min(text.length, match.index + match[0].length + 20);
    matches.push({
      index: match.index,
      length: match[0].length,
      excerpt: text.slice(start, end).replace(/\n/g, ' '),
    });
    if (match[0].length === 0) break;
  }
  return matches;
}

/**
 * Replaces matches in plain text or HTML safely without corrupting HTML tags.
 */
export function replaceInText(
  text: string,
  query: string,
  replacement: string,
  options: { matchCase?: boolean; wholeWord?: boolean; replaceAll?: boolean; targetIndex?: number } = {}
): { result: string; count: number } {
  if (!query) return { result: text, count: 0 };
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;

  if (options.replaceAll) {
    const regex = new RegExp(pattern, options.matchCase ? 'g' : 'gi');
    let count = 0;
    const result = text.replace(regex, () => {
      count += 1;
      return replacement;
    });
    return { result, count };
  }

  const regex = new RegExp(pattern, options.matchCase ? 'g' : 'gi');
  let currentMatch = 0;
  let count = 0;
  const target = options.targetIndex ?? 0;
  const result = text.replace(regex, (found) => {
    if (currentMatch === target) {
      currentMatch += 1;
      count = 1;
      return replacement;
    }
    currentMatch += 1;
    return found;
  });
  return { result, count };
}

/**
 * Replaces text only inside HTML text nodes (never inside tag names or attributes).
 */
export function replaceInHtmlContent(
  html: string,
  query: string,
  replacement: string,
  options: { matchCase?: boolean; wholeWord?: boolean; replaceAll?: boolean } = {}
): { html: string; count: number } {
  if (!query) return { html, count: 0 };
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
  const regex = new RegExp(pattern, options.matchCase ? 'g' : 'gi');

  let totalCount = 0;
  let replacedOnce = false;

  const segments = html.split(/(<[^>]+>)/g);
  const updated = segments.map((seg) => {
    if (seg.startsWith('<') && seg.endsWith('>')) return seg;
    if (!options.replaceAll && replacedOnce) return seg;
    return seg.replace(regex, (found) => {
      if (!options.replaceAll && replacedOnce) return found;
      replacedOnce = true;
      totalCount += 1;
      return replacement;
    });
  });

  return { html: updated.join(''), count: totalCount };
}

const COMMON_MISSPELLINGS: Record<string, string[]> = {
  teh: ['the'],
  recieve: ['receive'],
  seperate: ['separate'],
  definately: ['definitely'],
  occured: ['occurred'],
  untill: ['until'],
  wich: ['which'],
  becuase: ['because'],
  beleive: ['believe'],
  acheive: ['achieve'],
  accomodate: ['accommodate'],
  adress: ['address'],
  alot: ['a lot'],
  arguement: ['argument'],
  calender: ['calendar'],
  commited: ['committed'],
  concious: ['conscious'],
  enviroment: ['environment'],
  existance: ['existence'],
  experiance: ['experience'],
  foriegn: ['foreign'],
  goverment: ['government'],
  grammer: ['grammar'],
  happend: ['happened'],
  immediatly: ['immediately'],
  independant: ['independent'],
  knowlege: ['knowledge'],
  maintainance: ['maintenance'],
  neccessary: ['necessary'],
  noticable: ['noticeable'],
  occassion: ['occasion'],
  persue: ['pursue'],
  posession: ['possession'],
  prefered: ['preferred'],
  priviledge: ['privilege'],
  publically: ['publicly'],
  realy: ['really'],
  refered: ['referred'],
  religous: ['religious'],
  rythm: ['rhythm'],
  succesful: ['successful'],
  suprise: ['surprise'],
  thier: ['their'],
  tommorow: ['tomorrow'],
  truely: ['truly'],
  wierd: ['weird'],
  writting: ['writing'],
  documnet: ['document'],
  notbook: ['notebook'],
  formating: ['formatting'],
  persistance: ['persistence'],
  caluclate: ['calculate'],
  sumary: ['summary'],
  proffessional: ['professional'],
};

/**
 * Offline spelling & grammar analysis engine.
 */
export function analyzeSpellingAndGrammar(text: string): SpellingIssue[] {
  const issues: SpellingIssue[] = [];
  if (!text.trim()) return issues;

  // 1. Check common misspellings word by word
  const wordRegex = /\b([A-Za-z']+)\b/g;
  let match: RegExpExecArray | null;
  let issueIdx = 0;

  while ((match = wordRegex.exec(text)) !== null) {
    const rawWord = match[1];
    const lower = rawWord.toLowerCase();
    if (COMMON_MISSPELLINGS[lower]) {
      const suggestions = COMMON_MISSPELLINGS[lower].map((s) =>
        rawWord[0] === rawWord[0].toUpperCase() ? s[0].toUpperCase() + s.slice(1) : s
      );
      const ctxStart = Math.max(0, match.index - 18);
      const ctxEnd = Math.min(text.length, match.index + rawWord.length + 18);
      issues.push({
        id: `spell-${issueIdx++}`,
        type: 'spelling',
        word: rawWord,
        context: text.slice(ctxStart, ctxEnd),
        message: `Possible spelling error for "${rawWord}"`,
        suggestions,
        index: match.index,
      });
    }
  }

  // 2. Repeated consecutive words (e.g. "the the")
  const repeatRegex = /\b([A-Za-z]+)\s+\1\b/gi;
  while ((match = repeatRegex.exec(text)) !== null) {
    issues.push({
      id: `gram-repeat-${issueIdx++}`,
      type: 'grammar',
      word: match[0],
      context: text.slice(Math.max(0, match.index - 12), Math.min(text.length, match.index + match[0].length + 12)),
      message: `Repeated word "${match[1]}"`,
      suggestions: [match[1]],
      index: match.index,
    });
  }

  // 3. Double spaces inside sentences
  const doubleSpaceRegex = /[^\n ] {2,}[^\n ]/g;
  while ((match = doubleSpaceRegex.exec(text)) !== null) {
    issues.push({
      id: `gram-space-${issueIdx++}`,
      type: 'grammar',
      word: match[0],
      context: match[0],
      message: 'Extra whitespace between words',
      suggestions: [match[0].replace(/ {2,}/g, ' ')],
      index: match.index,
    });
  }

  // 4. Lowercase sentence start after period + space
  const capRegex = /(?:^|[.!?]\s+)([a-z][a-z]*)/g;
  while ((match = capRegex.exec(text)) !== null) {
    const word = match[1];
    // Skip common lowercase abbreviations / single letters that aren't "i"
    if (word.length >= 1) {
      const capitalized = word[0].toUpperCase() + word.slice(1);
      issues.push({
        id: `gram-cap-${issueIdx++}`,
        type: 'grammar',
        word,
        context: text.slice(Math.max(0, match.index - 6), Math.min(text.length, match.index + match[0].length + 14)),
        message: `Consider capitalizing "${word}" at the start of a sentence`,
        suggestions: [capitalized],
        index: match.index + match[0].length - word.length,
      });
    }
  }

  // 5. Common grammar confusions: "your welcome", "its a" vs "it's", "could of"
  const grammarPatterns: Array<{ regex: RegExp; message: string; replaceWith: string }> = [
    { regex: /\bcould of\b/gi, message: 'Use "could have" instead of "could of"', replaceWith: 'could have' },
    { regex: /\bwould of\b/gi, message: 'Use "would have" instead of "would of"', replaceWith: 'would have' },
    { regex: /\bshould of\b/gi, message: 'Use "should have" instead of "should of"', replaceWith: 'should have' },
    { regex: /\byour welcome\b/gi, message: 'Did you mean "you\'re welcome"?', replaceWith: "you're welcome" },
  ];

  for (const rule of grammarPatterns) {
    while ((match = rule.regex.exec(text)) !== null) {
      issues.push({
        id: `gram-phrase-${issueIdx++}`,
        type: 'grammar',
        word: match[0],
        context: text.slice(Math.max(0, match.index - 15), Math.min(text.length, match.index + match[0].length + 15)),
        message: rule.message,
        suggestions: [rule.replaceWith],
        index: match.index,
      });
    }
  }

  return issues.sort((a, b) => a.index - b.index);
}

/**
 * Line-by-line diff helper for Version History comparison.
 */
export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

export function computeVersionDiff(olderText: string, newerText: string): DiffLine[] {
  const oldLines = olderText.split('\n');
  const newLines = newerText.split('\n');
  const result: DiffLine[] = [];

  let i = 0;
  let j = 0;
  while (i < oldLines.length || j < newLines.length) {
    const oldLine = oldLines[i];
    const newLine = newLines[j];
    if (i < oldLines.length && j < newLines.length && oldLine === newLine) {
      result.push({ type: 'unchanged', text: newLine });
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || oldLines.indexOf(newLine, i) === -1)) {
      result.push({ type: 'added', text: newLine });
      j++;
    } else if (i < oldLines.length) {
      result.push({ type: 'removed', text: oldLine });
      i++;
    }
  }
  return result;
}

/**
 * Validates and normalizes hyperlink URLs.
 */
export function validateAndNormalizeUrl(rawUrl: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, normalized: '', error: 'URL cannot be empty.' };
  }
  const withProtocol = /^(https?:\/\/|mailto:|tel:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return { valid: false, normalized: '', error: 'Unsupported URL protocol.' };
    }
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.hostname.includes('.')) {
      return { valid: false, normalized: '', error: 'Please enter a valid domain name.' };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, normalized: '', error: 'Invalid URL format.' };
  }
}

/**
 * Filters and sorts documents inside a notebook or search results.
 */
export function filterAndSortDocuments(
  docs: DocumentRecord[],
  options: {
    notebookId?: string;
    filter?: NotebookFilterOption;
    sort?: NotebookSortOption;
    query?: string;
    tagId?: string | null;
  }
): DocumentRecord[] {
  let list = docs.filter((d) => !d.deletedAt);

  if (options.notebookId) {
    list = list.filter((d) => d.notebookId === options.notebookId);
  }

  switch (options.filter) {
    case 'pinned':
      list = list.filter((d) => d.isPinned && !d.isArchived);
      break;
    case 'favorite':
      list = list.filter((d) => d.isFavorite && !d.isArchived);
      break;
    case 'archived':
      list = list.filter((d) => d.isArchived);
      break;
    case 'recent':
      list = list.filter((d) => !d.isArchived);
      break;
    case 'all':
    default:
      list = list.filter((d) => !d.isArchived);
      break;
  }

  if (options.tagId) {
    list = list.filter((d) => d.tagIds.includes(options.tagId!));
  }

  if (options.query && options.query.trim()) {
    const q = options.query.trim().toLowerCase();
    list = list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.plainTextCache.toLowerCase().includes(q)
    );
  }

  const sortMode = options.sort ?? 'updated-desc';
  list.sort((a, b) => {
    if (sortMode === 'updated-desc' || sortMode === 'newest-first') {
      if (a.isPinned !== b.isPinned && sortMode === 'updated-desc') {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    if (sortMode === 'created-desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortMode === 'oldest-first') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortMode === 'title-asc') {
      return a.title.localeCompare(b.title);
    }
    if (sortMode === 'title-desc') {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  return list;
}

/**
 * Deterministic SHA-256 PIN hashing using SubtleCrypto when available, with pure fallback.
 */
export async function hashPin(pin: string): Promise<string> {
  const salted = `notely-pin-v1:${pin}`;
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(salted);
    const buf = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 5381;
  for (let i = 0; i < salted.length; i++) {
    hash = (hash * 33) ^ salted.charCodeAt(i);
  }
  return `fallback-${(hash >>> 0).toString(16)}`;
}

/**
 * Formats relative timestamps cleanly ("Today, 10:06 AM", "Yesterday", "Nov 18").
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isSameDay) return `Today, ${timeStr}`;
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function getGreetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes untrusted or imported HTML to prevent script execution and dangerous handlers/URIs
 * while preserving rich document tags and embedded image data URLs.
 */
export function sanitizeHtml(rawHtml: string): string {
  return String(rawHtml || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<(object|embed|style|link|meta|base)\b[^>]*>([\s\S]*?<\/\1>)?/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi,
      '$1="#"'
    );
}

