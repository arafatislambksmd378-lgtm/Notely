import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSpellingAndGrammar,
  computeDocumentStats,
  computeVersionDiff,
  escapeHtml,
  extractHeadings,
  extractPlainText,
  filterAndSortDocuments,
  findTextMatches,
  hashPin,
  replaceInHtmlContent,
  replaceInText,
  sanitizeHtml,
  transformTextCase,
  validateAndNormalizeUrl,
} from './documentUtils';
import { DEFAULT_PAGE_SETUP, type DocumentRecord, type StructuredContent } from '../types/notely';

const SAMPLE_DOC: StructuredContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Quarterly Strategy' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is a ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'critical' },
        { type: 'text', text: ' document for our team.' },
      ],
    },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items' }] },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ship editor' }] }],
        },
      ],
    },
  ],
};

test('extractPlainText extracts readable prose from TipTap JSON', () => {
  const txt = extractPlainText(SAMPLE_DOC);
  assert.match(txt, /Quarterly Strategy/);
  assert.match(txt, /This is a critical document for our team\./);
  assert.match(txt, /Ship editor/);
});

test('computeDocumentStats counts words, chars, sentences, paragraphs, pages', () => {
  const text = extractPlainText(SAMPLE_DOC);
  const stats = computeDocumentStats(text, SAMPLE_DOC, DEFAULT_PAGE_SETUP);
  assert.equal(stats.words, 14);
  assert.ok(stats.characters > stats.charactersWithoutSpaces);
  assert.equal(stats.paragraphs, 4);
  assert.equal(stats.pages, 1);
});

test('extractHeadings returns structured TOC entries', () => {
  const headings = extractHeadings(SAMPLE_DOC);
  assert.equal(headings.length, 2);
  assert.deepEqual(headings[0], { id: 'heading-0', level: 1, text: 'Quarterly Strategy', index: 0 });
  assert.deepEqual(headings[1], { id: 'heading-2', level: 2, text: 'Action Items', index: 2 });
});

test('transformTextCase transforms all 4 casing modes accurately', () => {
  assert.equal(transformTextCase('hello world', 'upper'), 'HELLO WORLD');
  assert.equal(transformTextCase('HELLO WORLD', 'lower'), 'hello world');
  assert.equal(transformTextCase('hello world from notely', 'title'), 'Hello World From Notely');
  assert.equal(transformTextCase('first sentence. second sentence!', 'sentence'), 'First sentence. Second sentence!');
});

test('findTextMatches and replaceInText support matchCase and wholeWord', () => {
  const text = 'Note taking in Notely is great for every note.';
  assert.equal(findTextMatches(text, 'note', { matchCase: false, wholeWord: true }).length, 2);
  assert.equal(findTextMatches(text, 'note', { matchCase: true, wholeWord: true }).length, 1);
  const replaced = replaceInText(text, 'note', 'memo', { matchCase: true, wholeWord: true, replaceAll: true });
  assert.equal(replaced.count, 1);
  assert.equal(replaced.result, 'Note taking in Notely is great for every memo.');
});

test('replaceInHtmlContent replaces text without corrupting HTML tags', () => {
  const html = '<p class="note">Take a <strong>note</strong> today.</p>';
  const res = replaceInHtmlContent(html, 'note', 'doc', { matchCase: true, wholeWord: true, replaceAll: true });
  assert.equal(res.count, 1);
  assert.equal(res.html, '<p class="note">Take a <strong>doc</strong> today.</p>');
});

test('analyzeSpellingAndGrammar detects typos, repeated words, and grammar mistakes', () => {
  const issues = analyzeSpellingAndGrammar('Teh documnet has the the error. we could of fixed it.');
  assert.ok(issues.some((i) => i.type === 'spelling' && i.word === 'Teh'));
  assert.ok(issues.some((i) => i.type === 'spelling' && i.word === 'documnet'));
  assert.ok(issues.some((i) => i.type === 'grammar' && i.message.includes('Repeated word')));
  assert.ok(issues.some((i) => i.type === 'grammar' && i.suggestions.includes('could have')));
});

test('computeVersionDiff identifies unchanged, added, and removed lines', () => {
  const diff = computeVersionDiff('line 1\nline 2\nline 3', 'line 1\nline 2 edited\nline 3\nline 4');
  assert.ok(diff.some((d) => d.type === 'unchanged' && d.text === 'line 1'));
  assert.ok(diff.some((d) => d.type === 'removed' && d.text === 'line 2'));
  assert.ok(diff.some((d) => d.type === 'added' && d.text === 'line 2 edited'));
  assert.ok(diff.some((d) => d.type === 'added' && d.text === 'line 4'));
});

test('validateAndNormalizeUrl validates and normalizes URLs safely', () => {
  assert.equal(validateAndNormalizeUrl('').valid, false);
  assert.equal(validateAndNormalizeUrl('example.com/docs').normalized, 'https://example.com/docs');
  assert.equal(validateAndNormalizeUrl('javascript:alert(1)').valid, false);
});

test('filterAndSortDocuments respects notebook, filter, query, and pin sorting', () => {
  const base: Omit<DocumentRecord, 'id' | 'title' | 'isPinned' | 'updatedAt'> = {
    notebookId: 'nb-1',
    ownerId: 'u-1',
    content: { type: 'doc', content: [] },
    htmlCache: '<p>Body</p>',
    plainTextCache: 'Body',
    documentSchemaVersion: 1,
    pageSetup: DEFAULT_PAGE_SETUP,
    cardColor: 'purple',
    isFavorite: false,
    isArchived: false,
    isLocked: false,
    tagIds: [],
    createdAt: '2026-11-18T10:00:00Z',
    deletedAt: null,
    syncStatus: 'local',
  };
  const docs: DocumentRecord[] = [
    { ...base, id: '1', title: 'Alpha', isPinned: false, updatedAt: '2026-11-20T12:00:00Z' },
    { ...base, id: '2', title: 'Beta', isPinned: true, updatedAt: '2026-11-19T12:00:00Z' },
  ];
  const sorted = filterAndSortDocuments(docs, { sort: 'updated-desc' });
  assert.equal(sorted[0].id, '2'); // Pinned appears first
  const alphaOnly = filterAndSortDocuments(docs, { query: 'Alpha' });
  assert.equal(alphaOnly.length, 1);
});

test('hashPin produces consistent deterministic hashes', async () => {
  const h1 = await hashPin('1234');
  const h2 = await hashPin('1234');
  const h3 = await hashPin('9999');
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test('sanitizeHtml strips scripts, event handlers, and javascript URIs while preserving formatting', () => {
  const dirty = '<p onclick="alert(1)">Hello <strong>World</strong></p><script>evil()</script><a href="javascript:alert(2)">Link</a><img src="data:image/png;base64,AAAA" onerror="xss()"/>';
  const clean = sanitizeHtml(dirty);
  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('onerror'), false);
  assert.equal(clean.includes('javascript:'), false);
  assert.match(clean, /<strong>World<\/strong>/);
  assert.match(clean, /data:image\/png;base64,AAAA/);
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
});

test('extractPlainText and computeDocumentStats handle sectionBreak, footnote, and callout', () => {
  const richDoc: StructuredContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Intro sentence.' },
          { type: 'footnote', attrs: { number: 1, text: 'Primary citation' } },
        ],
      },
      { type: 'sectionBreak' },
      { type: 'callout', attrs: { label: 'Tip', text: 'Verify exports' } },
    ],
  };
  const plain = extractPlainText(richDoc);
  assert.match(plain, /Primary citation/);
  assert.match(plain, /Tip: Verify exports/);
  const stats = computeDocumentStats(plain, richDoc, DEFAULT_PAGE_SETUP);
  assert.equal(stats.pages, 2);
});

