import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  GitCompare,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import { AppButton, BottomSheet } from '../DesignSystem';
import {
  analyzeSpellingAndGrammar,
  computeDocumentStats,
  computeVersionDiff,
  findTextMatches,
  replaceInHtmlContent,
} from '../../utils/documentUtils';
import type {
  DocumentRecord,
  MarginPreset,
  PageSetup,
  PaperSize,
  StructuredContent,
} from '../../types/notely';
import { useNotely } from '../../context/NotelyContext';

/* 1. Page Setup Modal */
export function PageSetupModal({
  open,
  onClose,
  pageSetup,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  pageSetup: PageSetup;
  onSave: (next: PageSetup) => void;
}) {
  const [draft, setDraft] = useState<PageSetup>(pageSetup);

  useEffect(() => {
    if (open) {
      setDraft(pageSetup);
    }
  }, [open, pageSetup]);

  const applyMarginPreset = (preset: MarginPreset) => {
    const map: Record<Exclude<MarginPreset, 'custom'>, PageSetup['marginsMm']> = {
      normal: { top: 25, right: 25, bottom: 25, left: 25 },
      narrow: { top: 12, right: 12, bottom: 12, left: 12 },
      moderate: { top: 25, right: 19, bottom: 25, left: 19 },
      wide: { top: 25, right: 40, bottom: 25, left: 40 },
    };
    setDraft((prev) => ({
      ...prev,
      marginPreset: preset,
      marginsMm: preset === 'custom' ? prev.marginsMm : map[preset],
    }));
  };

  const pageColors = ['#FFFFFF', '#FAF8F2', '#F3F1FB', '#EEF7F2', '#EEF4FC', '#FFF8E6'];

  return (
    <BottomSheet open={open} onClose={onClose} title="Page setup" maxWidth="max-w-xl">
      <div className="space-y-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Orientation</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#F4F3F8] dark:bg-[#242232]">
              {(['portrait', 'landscape'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setDraft({ ...draft, orientation: o })}
                  className={`h-8 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    draft.orientation === o
                      ? 'bg-white dark:bg-[#1B1A26] text-[var(--notely-accent)] shadow-sm'
                      : 'text-[#5C5A68] dark:text-[#B2B0BE]'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Paper size</label>
            <select
              value={draft.paperSize}
              onChange={(e) => setDraft({ ...draft, paperSize: e.target.value as PaperSize })}
              className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
              <option value="Legal">Legal (8.5 × 14 in)</option>
              <option value="A3">A3 (297 × 420 mm)</option>
              <option value="A5">A5 (148 × 210 mm)</option>
              <option value="Custom">Custom dimensions</option>
            </select>
          </div>
        </div>

        {draft.paperSize === 'Custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Width (mm)</label>
              <input
                type="number"
                value={draft.customWidthMm ?? 210}
                onChange={(e) => setDraft({ ...draft, customWidthMm: Number(e.target.value) || 210 })}
                className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Height (mm)</label>
              <input
                type="number"
                value={draft.customHeightMm ?? 297}
                onChange={(e) => setDraft({ ...draft, customHeightMm: Number(e.target.value) || 297 })}
                className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#5C5A68] mb-1.5">Margins</label>
          <div className="grid grid-cols-5 gap-1.5">
            {(['normal', 'narrow', 'moderate', 'wide', 'custom'] as MarginPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyMarginPreset(p)}
                className={`h-9 rounded-xl text-xs font-semibold capitalize cursor-pointer ${
                  draft.marginPreset === p
                    ? 'bg-[var(--notely-accent)] text-white'
                    : 'bg-[#F4F3F8] dark:bg-[#242232] text-[#5C5A68] dark:text-[#B2B0BE]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {draft.marginPreset === 'custom' && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <div key={side}>
                  <label className="block text-[11px] text-[#92909D] capitalize">{side} (mm)</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={draft.marginsMm[side]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        marginsMm: { ...draft.marginsMm, [side]: Number(e.target.value) || 15 },
                      })
                    }
                    className="w-full h-9 px-2 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5C5A68] mb-1.5">Page color</label>
          <div className="flex items-center gap-2.5">
            {pageColors.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Page color ${hex}`}
                onClick={() => setDraft({ ...draft, pageColor: hex })}
                className={`w-8 h-8 rounded-full border border-[#D8D5E2] flex items-center justify-center cursor-pointer ${
                  draft.pageColor === hex ? 'ring-2 ring-[var(--notely-accent)] ring-offset-2' : ''
                }`}
                style={{ backgroundColor: hex }}
              >
                {draft.pageColor === hex && <Check className="w-4 h-4 text-[#24232B]" />}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Header text</label>
            <input
              type="text"
              value={draft.headerText}
              onChange={(e) => setDraft({ ...draft, headerText: e.target.value })}
              placeholder="Optional document header"
              className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Footer text</label>
            <input
              type="text"
              value={draft.footerText}
              onChange={(e) => setDraft({ ...draft, footerText: e.target.value })}
              placeholder="Optional document footer"
              className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Watermark</label>
          <input
            type="text"
            value={draft.watermarkText ?? ''}
            onChange={(e) => setDraft({ ...draft, watermarkText: e.target.value })}
            placeholder="e.g., DRAFT or CONFIDENTIAL"
            className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-4 pt-1 text-xs font-medium">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.showPageNumbers}
              onChange={(e) => setDraft({ ...draft, showPageNumbers: e.target.checked })}
              className="accent-[var(--notely-accent)]"
            />
            Show page numbers
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.showPageBorder}
              onChange={(e) => setDraft({ ...draft, showPageBorder: e.target.checked })}
              className="accent-[var(--notely-accent)]"
            />
            Show page border
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.differentFirstPage}
              onChange={(e) => setDraft({ ...draft, differentFirstPage: e.target.checked })}
              className="accent-[var(--notely-accent)]"
            />
            Hide header on first page
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Apply Page Setup
          </AppButton>
        </div>
      </div>
    </BottomSheet>
  );
}

/* 2. Find & Replace Modal */
export function FindReplaceModal({
  open,
  onClose,
  plainText,
  html,
  onApplyHtml,
}: {
  open: boolean;
  onClose: () => void;
  plainText: string;
  html: string;
  onApplyHtml: (nextHtml: string, replacedCount: number) => void;
}) {
  const [findQuery, setFindQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  const matches = useMemo(
    () => findTextMatches(plainText, findQuery, { matchCase, wholeWord }),
    [plainText, findQuery, matchCase, wholeWord]
  );

  const safeIdx = matches.length ? activeMatchIdx % matches.length : 0;

  return (
    <BottomSheet open={open} onClose={onClose} title="Find and replace">
      <div className="space-y-3.5 pb-2">
        <div>
          <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Find</label>
          <input
            type="text"
            value={findQuery}
            onChange={(e) => {
              setFindQuery(e.target.value);
              setActiveMatchIdx(0);
            }}
            placeholder="Search inside document..."
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Replace with</label>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replacement text..."
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
                className="accent-[var(--notely-accent)]"
              />
              Match case
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="accent-[var(--notely-accent)]"
              />
              Whole word
            </label>
          </div>
          <span className="font-semibold text-[var(--notely-accent)] tabular-nums">
            {matches.length > 0 ? `${safeIdx + 1} of ${matches.length}` : '0 matches'}
          </span>
        </div>

        {matches[safeIdx] && (
          <div className="p-3 rounded-xl bg-[#F8F7FB] dark:bg-[#242232] text-xs text-[#5C5A68] dark:text-[#B2B0BE]">
            “...{matches[safeIdx].excerpt}...”
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <AppButton
              size="sm"
              variant="secondary"
              disabled={matches.length === 0}
              onClick={() =>
                setActiveMatchIdx((i) => (i - 1 + matches.length) % Math.max(1, matches.length))
              }
            >
              Prev
            </AppButton>
            <AppButton
              size="sm"
              variant="secondary"
              disabled={matches.length === 0}
              onClick={() => setActiveMatchIdx((i) => (i + 1) % Math.max(1, matches.length))}
            >
              Next
            </AppButton>
          </div>

          <div className="flex gap-2">
            <AppButton
              size="sm"
              variant="outline"
              disabled={matches.length === 0}
              onClick={() => {
                const res = replaceInHtmlContent(html, findQuery, replaceText, {
                  matchCase,
                  wholeWord,
                  replaceAll: false,
                });
                onApplyHtml(res.html, res.count);
              }}
            >
              Replace One
            </AppButton>
            <AppButton
              size="sm"
              disabled={matches.length === 0}
              onClick={() => {
                const res = replaceInHtmlContent(html, findQuery, replaceText, {
                  matchCase,
                  wholeWord,
                  replaceAll: true,
                });
                onApplyHtml(res.html, res.count);
              }}
            >
              Replace All
            </AppButton>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

/* 3. Word Count Modal */
export function WordCountModal({
  open,
  onClose,
  plainText,
  content,
  pageSetup,
}: {
  open: boolean;
  onClose: () => void;
  plainText: string;
  content: StructuredContent;
  pageSetup: PageSetup;
}) {
  const stats = useMemo(
    () => computeDocumentStats(plainText, content, pageSetup),
    [plainText, content, pageSetup]
  );

  const items = [
    { label: 'Total words', value: stats.words, color: '#8950F5' },
    { label: 'Characters', value: stats.characters, color: '#3B82F6' },
    { label: 'Characters (no spaces)', value: stats.charactersWithoutSpaces, color: '#22C55E' },
    { label: 'Sentences', value: stats.sentences, color: '#EAB308' },
    { label: 'Paragraphs', value: stats.paragraphs, color: '#EC4899' },
    { label: 'Estimated pages', value: stats.pages, color: '#14B8A6' },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Word count">
      <div className="grid grid-cols-2 gap-3 pb-2">
        {items.map((item) => (
          <div key={item.label} className="notely-card rounded-2xl p-4">
            <div className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>
              {item.value}
            </div>
            <div className="text-xs text-[#92909D] mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

/* 4. Spelling & Grammar Modal */
export function SpellingGrammarModal({
  open,
  onClose,
  plainText,
  html,
  onApplyHtml,
}: {
  open: boolean;
  onClose: () => void;
  plainText: string;
  html: string;
  onApplyHtml: (nextHtml: string) => void;
}) {
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const issues = useMemo(
    () => analyzeSpellingAndGrammar(plainText).filter((i) => !ignoredIds.includes(i.id)),
    [plainText, ignoredIds]
  );

  const handleFix = (word: string, suggestion: string) => {
    const res = replaceInHtmlContent(html, word, suggestion, {
      matchCase: true,
      wholeWord: false,
      replaceAll: false,
    });
    if (res.count > 0) {
      onApplyHtml(res.html);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Spelling & grammar">
      <div className="space-y-3 pb-2">
        {issues.length === 0 ? (
          <div className="notely-card rounded-2xl p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#E8F8F0] text-[#22C55E] flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold">Looks great!</div>
            <p className="text-xs text-[#92909D]">No spelling or grammar issues detected.</p>
          </div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="notely-card rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-bold uppercase ${
                    issue.type === 'spelling' ? 'text-[#EF4444]' : 'text-[#EAB308]'
                  }`}
                >
                  {issue.type}
                </span>
                <button
                  type="button"
                  onClick={() => setIgnoredIds((prev) => [...prev, issue.id])}
                  className="text-xs font-medium text-[#92909D] hover:text-[#24232B] cursor-pointer"
                >
                  Ignore
                </button>
              </div>
              <div className="text-sm font-semibold">{issue.message}</div>
              <div className="text-xs text-[#92909D] bg-[#F4F3F8] dark:bg-[#242232] p-2 rounded-lg">
                “...{issue.context}...”
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {issue.suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleFix(issue.word, sug)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--notely-accent)] text-white text-xs font-semibold cursor-pointer"
                  >
                    Use “{sug}”
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </BottomSheet>
  );
}

/* 5. Version History Modal */
export function VersionHistoryModal({
  open,
  onClose,
  doc,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  doc: DocumentRecord;
  onRestored: (restored: DocumentRecord) => void;
}) {
  const { versions, createManualVersion, restoreVersion, deleteVersion } = useNotely();
  const [label, setLabel] = useState('');
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);

  const docVersions = useMemo(
    () =>
      versions
        .filter((v) => v.documentId === doc.id)
        .sort((a, b) => b.versionNumber - a.versionNumber),
    [versions, doc.id]
  );

  const comparing = docVersions.find((v) => v.id === compareVersionId);
  const diffLines = useMemo(() => {
    if (!comparing) return [];
    const oldTxt = comparing.htmlSnapshot.replace(/<[^>]+>/g, '\n').trim();
    return computeVersionDiff(oldTxt, doc.plainTextCache);
  }, [comparing, doc.plainTextCache]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Version history" maxWidth="max-w-xl">
      <div className="space-y-4 pb-2">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createManualVersion(doc.id, label);
            setLabel('');
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Snapshot label (e.g., Before client review)"
            className="flex-1 h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
          />
          <AppButton type="submit" size="sm">
            <Plus className="w-4 h-4" /> Save Snapshot
          </AppButton>
        </form>

        {comparing && (
          <div className="notely-card rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--notely-accent)]">
                Comparing v{comparing.versionNumber} → Current
              </span>
              <button
                type="button"
                onClick={() => setCompareVersionId(null)}
                className="text-xs text-[#92909D] cursor-pointer"
              >
                Close diff
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono-tabular">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`px-2 py-0.5 rounded ${
                    line.type === 'added'
                      ? 'bg-[#E8F8F0] text-[#15803D]'
                      : line.type === 'removed'
                        ? 'bg-[#FEECEC] text-[#B91C1C]'
                        : 'text-[#5C5A68] dark:text-[#B2B0BE]'
                  }`}
                >
                  {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                  {line.text || ' '}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {docVersions.map((ver) => (
            <div
              key={ver.id}
              className="notely-card rounded-2xl p-3.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
                  <span className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8] truncate">
                    v{ver.versionNumber} · {ver.versionLabel}
                  </span>
                </div>
                <div className="text-[11px] text-[#92909D] mt-0.5">
                  {new Date(ver.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCompareVersionId(ver.id)}
                  aria-label={`Compare version ${ver.versionNumber}`}
                  className="p-2 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold cursor-pointer"
                >
                  <GitCompare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const restored = await restoreVersion(doc.id, ver.id);
                    if (restored) {
                      onRestored(restored);
                      onClose();
                    }
                  }}
                  className="px-3 h-8 rounded-xl bg-[var(--notely-accent)] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
                <button
                  type="button"
                  aria-label={`Delete version ${ver.versionNumber}`}
                  onClick={() => deleteVersion(ver.id)}
                  className="p-2 rounded-xl text-[#EF4444] hover:bg-[#FEECEC] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

/* 6. Comments Modal */
export function CommentsModal({
  open,
  onClose,
  docId,
  selectedText,
}: {
  open: boolean;
  onClose: () => void;
  docId: string;
  selectedText: string;
}) {
  const { comments, addComment, replyToComment, toggleResolveComment, deleteComment } = useNotely();
  const [content, setContent] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const docComments = useMemo(
    () => comments.filter((c) => c.documentId === docId),
    [comments, docId]
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Comments">
      <div className="space-y-4 pb-2">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!content.trim()) return;
            await addComment(docId, content, selectedText || 'Document note');
            setContent('');
          }}
          className="space-y-2"
        >
          {selectedText && (
            <div className="text-xs px-3 py-1.5 rounded-xl bg-[var(--notely-accent-light)] text-[var(--notely-accent)]">
              Referenced text: “{selectedText.slice(0, 60)}”
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            />
            <AppButton type="submit" size="sm">
              <Send className="w-4 h-4" />
            </AppButton>
          </div>
        </form>

        {docComments.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#92909D]">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No comments yet. Select text or add a comment above.
          </div>
        ) : (
          <div className="space-y-3">
            {docComments.map((c) => (
              <div
                key={c.id}
                className={`notely-card rounded-2xl p-3.5 space-y-2 ${
                  c.resolved ? 'opacity-65' : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{c.authorName}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleResolveComment(c.id)}
                      className="font-semibold text-[var(--notely-accent)] cursor-pointer"
                    >
                      {c.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteComment(c.id)}
                      className="text-[#EF4444] cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {c.anchorText && (
                  <div className="text-[11px] text-[#92909D] italic">On: “{c.anchorText}”</div>
                )}
                <p className="text-sm">{c.content}</p>
                {c.replies.map((r) => (
                  <div
                    key={r.id}
                    className="ml-3 pl-3 border-l-2 border-[#ECEAF1] dark:border-[#323042] text-xs space-y-0.5"
                  >
                    <span className="font-bold">{r.authorName}: </span>
                    <span>{r.content}</span>
                  </div>
                ))}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const txt = replyDrafts[c.id];
                    if (!txt?.trim()) return;
                    await replyToComment(c.id, txt);
                    setReplyDrafts((prev) => ({ ...prev, [c.id]: '' }));
                  }}
                  className="flex gap-1.5 pt-1"
                >
                  <input
                    type="text"
                    value={replyDrafts[c.id] ?? ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    placeholder="Reply..."
                    className="flex-1 h-8 px-2.5 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-xs"
                  />
                  <button
                    type="submit"
                    className="px-2.5 h-8 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold cursor-pointer"
                  >
                    Reply
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
