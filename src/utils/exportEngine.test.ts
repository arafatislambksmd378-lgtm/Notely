import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { generateExport, importDocumentFile, parseRtfToHtml } from './exportEngine';
import { decryptNotePayload, encryptNotePayload } from '../db/localDatabase';
import { DEFAULT_PAGE_SETUP, type DocumentRecord } from '../types/notely';

const MOCK_DOC: DocumentRecord = {
  id: 'doc-export-test',
  title: 'Smoke Check Note',
  notebookId: 'nb-personal',
  ownerId: 'writer',
  content: {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Overview' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Testing persistence and ' },
          { type: 'text', marks: [{ type: 'bold' }], text: 'export formatting' },
          { type: 'text', text: '.' },
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Header 1' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Header 2' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Row A' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Row B' }] }] },
            ],
          },
        ],
      },
    ],
  },
  htmlCache:
    '<h1>Overview</h1><p>Testing persistence and <strong>export formatting</strong>.</p><table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Row A</td><td>Row B</td></tr></table>',
  plainTextCache: 'Overview\nTesting persistence and export formatting.\nHeader 1 Header 2\nRow A Row B',
  documentSchemaVersion: 1,
  pageSetup: {
    ...DEFAULT_PAGE_SETUP,
    headerText: 'Notely Confidential',
    footerText: 'Draft 1',
    showPageNumbers: true,
  },
  cardColor: 'purple',
  isPinned: true,
  isFavorite: false,
  isArchived: false,
  isLocked: false,
  tagIds: [],
  createdAt: '2026-11-20T10:00:00Z',
  updatedAt: '2026-11-20T13:09:00Z',
  deletedAt: null,
  syncStatus: 'local',
};

test('TXT export generates readable plain text', async () => {
  const res = await generateExport(MOCK_DOC, 'txt');
  const txt = new TextDecoder().decode(res.bytes);
  assert.equal(res.fileName, 'Smoke_Check_Note.txt');
  assert.match(txt, /Smoke Check Note/);
  assert.match(txt, /Testing persistence and export formatting\./);
});

test('Markdown export converts headings and bold formatting', async () => {
  const res = await generateExport(MOCK_DOC, 'md');
  const md = new TextDecoder().decode(res.bytes);
  assert.equal(res.fileName, 'Smoke_Check_Note.md');
  assert.match(md, /# Smoke Check Note/);
  assert.match(md, /\*\*export formatting\*\*/);
});

test('HTML export produces valid standalone HTML5 with page setup', async () => {
  const res = await generateExport(MOCK_DOC, 'html');
  const html = new TextDecoder().decode(res.bytes);
  assert.equal(res.fileName, 'Smoke_Check_Note.html');
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /Notely Confidential/);
  assert.match(html, /<strong>export formatting<\/strong>/);
});

test('RTF export produces valid RTF document and round-trips text', async () => {
  const res = await generateExport(MOCK_DOC, 'rtf');
  const rtf = new TextDecoder().decode(res.bytes);
  assert.equal(res.fileName, 'Smoke_Check_Note.rtf');
  assert.ok(rtf.startsWith('{\\rtf1'));
  assert.match(rtf, /\\b export formatting\\b0/);
  const htmlBack = parseRtfToHtml(rtf);
  assert.match(htmlBack, /export formatting/);
});

test('DOCX export produces valid OpenXML ZIP archive with document.xml', async () => {
  const res = await generateExport(MOCK_DOC, 'docx');
  assert.equal(res.fileName, 'Smoke_Check_Note.docx');
  assert.equal(res.bytes[0], 0x50); // 'P'
  assert.equal(res.bytes[1], 0x4b); // 'K'
  const zip = await JSZip.loadAsync(res.bytes);
  const docXml = await zip.file('word/document.xml')?.async('string');
  assert.ok(docXml, 'word/document.xml must exist inside DOCX');
  assert.match(docXml, /Smoke Check Note/);
  assert.match(docXml, /export formatting/);
  assert.match(docXml, /Header 1/);
});

test('ODT export produces valid OpenDocument ZIP archive with content.xml', async () => {
  const res = await generateExport(MOCK_DOC, 'odt');
  assert.equal(res.fileName, 'Smoke_Check_Note.odt');
  const zip = await JSZip.loadAsync(res.bytes);
  const mimetype = await zip.file('mimetype')?.async('string');
  assert.equal(mimetype, 'application/vnd.oasis.opendocument.text');
  const contentXml = await zip.file('content.xml')?.async('string');
  assert.ok(contentXml, 'content.xml must exist inside ODT');
  assert.match(contentXml, /Smoke Check Note/);
  assert.match(contentXml, /Testing persistence/);
});

test('PDF export generates valid binary PDF document', async () => {
  const res = await generateExport(MOCK_DOC, 'pdf');
  assert.equal(res.fileName, 'Smoke_Check_Note.pdf');
  const header = new TextDecoder('latin1').decode(res.bytes.slice(0, 8));
  assert.ok(header.startsWith('%PDF-'), `Expected %PDF- header, got ${header}`);
  assert.ok(res.bytes.length > 800);
});

test('Exports handle charts, callouts, footnotes, hyperlinks, and section breaks across PDF/DOCX/HTML/RTF', async () => {
  const richDoc: DocumentRecord = {
    ...MOCK_DOC,
    title: 'Rich Multi-Element Note',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Visit ' },
            { type: 'text', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }], text: 'Docs' },
            { type: 'footnote', attrs: { number: 1, text: 'Source reference A' } },
          ],
        },
        {
          type: 'chart',
          attrs: {
            title: 'Growth Metrics',
            config: {
              chartType: 'bar',
              title: 'Growth Metrics',
              palette: 'purple',
              rows: [
                { label: 'Jan', value: 25 },
                { label: 'Feb', value: 75 },
              ],
            },
          },
        },
        { type: 'callout', attrs: { label: 'Callout', text: 'Important note', color: 'purple' } },
        { type: 'sectionBreak' },
      ],
    },
    htmlCache:
      '<p>Visit <a href="https://example.com">Docs</a><span data-notely-footnote="true">[1: Source reference A]</span></p><div data-notely-chart="true" data-config="{&quot;chartType&quot;:&quot;bar&quot;,&quot;title&quot;:&quot;Growth Metrics&quot;,&quot;palette&quot;:&quot;purple&quot;,&quot;rows&quot;:[{&quot;label&quot;:&quot;Jan&quot;,&quot;value&quot;:25},{&quot;label&quot;:&quot;Feb&quot;,&quot;value&quot;:75}]}">[Chart: Growth Metrics]</div><script>alert(1)</script>',
  };

  const htmlRes = await generateExport(richDoc, 'html');
  const html = new TextDecoder().decode(htmlRes.bytes);
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /<svg/);
  assert.match(html, /Source reference A/);

  const docxRes = await generateExport(richDoc, 'docx');
  const zip = await JSZip.loadAsync(docxRes.bytes);
  const docXml = await zip.file('word/document.xml')?.async('string');
  assert.ok(docXml);
  assert.match(docXml, /Growth Metrics/);
  assert.match(docXml, /Source reference A/);
  assert.match(docXml, /Important note/);

  const pdfRes = await generateExport(richDoc, 'pdf');
  assert.ok(pdfRes.bytes.length > 1000);

  // Verify compressed PDF stream import round-trip extracts readable text
  const pdfFile = new File([new Uint8Array(pdfRes.bytes)], 'Rich_Multi-Element_Note.pdf', {
    type: 'application/pdf',
  });
  const importedPdf = await importDocumentFile(pdfFile);
  assert.equal(importedPdf.sourceFormat, 'PDF');
  assert.match(importedPdf.plainText, /Rich Multi-Element Note/);
});

test('importDocumentFile strips XSS vectors from imported HTML and Markdown files', async () => {
  const maliciousHtml =
    '<html><head><title>Attack</title></head><body><h1 onclick="evil()">Safe Title</h1><script>steal()</script><a href="javascript:alert(1)">Click</a></body></html>';
  const file = new File([maliciousHtml], 'evil.html', { type: 'text/html' });
  const imported = await importDocumentFile(file);
  assert.equal(imported.html.includes('<script>'), false);
  assert.equal(imported.html.includes('onclick'), false);
  assert.equal(imported.html.includes('javascript:'), false);
  assert.match(imported.html, /Safe Title/);
});

test('encryptNotePayload and decryptNotePayload handle >100KB payloads without stack overflow', async () => {
  const largePayload = JSON.stringify({
    content: 'A'.repeat(120_000),
    image: 'data:image/png;base64,' + 'B'.repeat(90_000),
  });
  const encrypted = await encryptNotePayload(largePayload, 'pin-4321');
  const decrypted = await decryptNotePayload(encrypted, 'pin-4321');
  assert.equal(decrypted, largePayload);
});

