import React from 'react';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { Bookmark, RefreshCw, Trash2, Volume2 } from 'lucide-react';
import type { ChartConfig } from '../../types/notely';
import { CARD_COLORS } from '../../types/notely';

/* 1. Interactive SVG Chart Node */
function ChartNodeView({ node, deleteNode }: NodeViewProps) {
  const config = (node.attrs.config as ChartConfig) ?? {
    chartType: 'bar',
    title: 'Chart',
    rows: [
      { label: 'Q1', value: 40 },
      { label: 'Q2', value: 65 },
      { label: 'Q3', value: 85 },
    ],
    palette: 'purple',
  };

  const rows = config.rows?.length ? config.rows : [{ label: 'Item', value: 50 }];
  const maxVal = Math.max(1, ...rows.map((r) => Number(r.value) || 0));
  const totalVal = Math.max(1, rows.reduce((s, r) => s + Math.max(0, Number(r.value) || 0), 0));
  const paletteColors = ['#8950F5', '#3B82F6', '#22C55E', '#EAB308', '#EC4899', '#14B8A6'];
  const primaryHex = CARD_COLORS[config.palette]?.hex ?? '#8950F5';

  return (
    <NodeViewWrapper className="my-4 not-prose">
      <div className="rounded-2xl border border-[#ECEAF1] dark:border-[#2E2C3E] bg-[#FBFBFD] dark:bg-[#171622] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">
            {config.title || 'Data Chart'}
          </div>
          <button
            type="button"
            onClick={deleteNode}
            aria-label="Remove chart"
            className="p-1.5 rounded-lg text-[#92909D] hover:text-[#EF4444] hover:bg-[#FEECEC] dark:hover:bg-[#3A1E22] cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {(config.chartType === 'bar' || config.chartType === 'line' || config.chartType === 'area') && (
          <svg viewBox="0 0 360 150" className="w-full h-40 overflow-visible">
            <line x1="28" y1="120" x2="345" y2="120" stroke="#D8D5E2" strokeWidth="1" />
            {config.chartType === 'bar' &&
              rows.map((row, idx) => {
                const bw = Math.min(44, 260 / rows.length - 8);
                const gap = (300 - bw * rows.length) / Math.max(1, rows.length + 1);
                const x = 32 + gap + idx * (bw + gap);
                const h = (Math.max(0, row.value) / maxVal) * 95;
                const y = 120 - h;
                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={y}
                      width={bw}
                      height={Math.max(3, h)}
                      rx="6"
                      fill={row.color || paletteColors[idx % paletteColors.length]}
                    />
                    <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize="9" fill="#716F7D">
                      {row.value}
                    </text>
                    <text x={x + bw / 2} y={136} textAnchor="middle" fontSize="9" fill="#716F7D">
                      {row.label.slice(0, 8)}
                    </text>
                  </g>
                );
              })}

            {(config.chartType === 'line' || config.chartType === 'area') && (() => {
              const pts = rows.map((row, idx) => {
                const x = 40 + (idx * 290) / Math.max(1, rows.length - 1);
                const y = 115 - (Math.max(0, row.value) / maxVal) * 90;
                return { x, y, row };
              });
              const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaPath = `${linePath} L ${pts[pts.length - 1].x} 120 L ${pts[0].x} 120 Z`;
              return (
                <>
                  {config.chartType === 'area' && (
                    <path d={areaPath} fill={primaryHex} fillOpacity="0.18" />
                  )}
                  <path d={linePath} fill="none" stroke={primaryHex} strokeWidth="2.5" strokeLinecap="round" />
                  {pts.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill={primaryHex} stroke="#fff" strokeWidth="1.5" />
                      <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#716F7D">
                        {p.row.value}
                      </text>
                      <text x={p.x} y={136} textAnchor="middle" fontSize="9" fill="#716F7D">
                        {p.row.label.slice(0, 8)}
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
        )}

        {(config.chartType === 'pie' || config.chartType === 'doughnut') && (
          <div className="flex flex-wrap items-center justify-center gap-6 py-2">
            <svg viewBox="0 0 120 120" className="w-32 h-32">
              {(() => {
                let cumulative = 0;
                return rows.map((row, idx) => {
                  const pct = Math.max(0, row.value) / totalVal;
                  const r = 42;
                  const circ = 2 * Math.PI * r;
                  const dash = pct * circ;
                  const offset = -cumulative * circ;
                  cumulative += pct;
                  return (
                    <circle
                      key={idx}
                      cx="60"
                      cy="60"
                      r={r}
                      fill="transparent"
                      stroke={row.color || paletteColors[idx % paletteColors.length]}
                      strokeWidth={config.chartType === 'doughnut' ? 18 : 42}
                      strokeDasharray={`${dash} ${circ - dash}`}
                      strokeDashoffset={offset}
                      transform="rotate(-90 60 60)"
                    />
                  );
                });
              })()}
            </svg>
            <div className="space-y-1.5 text-xs">
              {rows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: row.color || paletteColors[idx % paletteColors.length] }}
                  />
                  <span className="font-medium text-[#24232B] dark:text-[#F4F3F8]">{row.label}</span>
                  <span className="text-[#92909D] tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ChartBlock = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      title: { default: 'Chart' },
      config: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-config');
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        },
        renderHTML: (attributes) => {
          if (!attributes.config) return {};
          return { 'data-config': JSON.stringify(attributes.config) };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-notely-chart]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const label = node.attrs?.title || 'Chart';
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-notely-chart': 'true' }),
      `[Chart: ${label}]`,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});

/* 2. Drawing Block Node */
function DrawingNodeView({ node, deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className="my-3 not-prose">
      <div className="relative group rounded-2xl border border-[#ECEAF1] dark:border-[#2E2C3E] bg-white p-2 inline-block max-w-full">
        <img
          src={String(node.attrs.src || '')}
          alt={String(node.attrs.caption || 'Handwritten drawing')}
          className="max-h-80 rounded-xl object-contain"
        />
        <button
          type="button"
          onClick={deleteNode}
          aria-label="Remove drawing"
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/90 text-[#EF4444] shadow-sm opacity-90 hover:opacity-100 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const DrawingBlock = Node.create({
  name: 'drawing',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: '' },
      caption: { default: 'Drawing' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-notely-drawing]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-notely-drawing': 'true' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DrawingNodeView);
  },
});

/* 3. Mathematical Equation Node */
function EquationNodeView({ node, deleteNode }: NodeViewProps) {
  const latex = String(node.attrs.latex || '');
  return (
    <NodeViewWrapper className="my-3 not-prose">
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#F8F7FB] dark:bg-[#1E1C2B] border border-[#ECEAF1] dark:border-[#2E2C3E]">
        <div className="font-editorial text-lg tracking-wide text-[#24232B] dark:text-[#F4F3F8]">
          {latex}
        </div>
        <button
          type="button"
          onClick={deleteNode}
          aria-label="Remove equation"
          className="p-1 rounded-lg text-[#92909D] hover:text-[#EF4444] cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const EquationBlock = Node.create({
  name: 'equation',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      latex: { default: 'E = mc²' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-notely-equation]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-notely-equation': 'true' }), HTMLAttributes.latex || ''];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EquationNodeView);
  },
});

/* 4. Footnote Inline Node */
function FootnoteNodeView({ node, getPos }: NodeViewProps) {
  const num = Number(node.attrs.number || 1);
  const text = String(node.attrs.text || '');
  return (
    <NodeViewWrapper as="span" className="inline-flex items-baseline mx-0.5">
      <button
        type="button"
        title={text || 'Inspect or edit footnote'}
        aria-label={`Footnote ${num}: ${text}`}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--notely-accent-light)] dark:bg-[#2E224C] text-[var(--notely-accent)] text-[11px] font-bold align-super cursor-pointer"
        onClick={() => {
          const pos = typeof getPos === 'function' ? getPos() : -1;
          window.dispatchEvent(
            new CustomEvent('notely-edit-footnote', {
              detail: { pos, number: num, text },
            })
          );
        }}
      >
        [{num}]
      </button>
    </NodeViewWrapper>
  );
}

export const FootnoteNode = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      number: { default: 1 },
      text: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-notely-footnote]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-notely-footnote': 'true' }),
      `[${HTMLAttributes.number || 1}: ${HTMLAttributes.text || ''}]`,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FootnoteNodeView);
  },
});

/* 5. Table of Contents Auto-Block */
function TocNodeView({ editor, deleteNode }: NodeViewProps) {
  const headings: Array<{ level: number; text: string; pos: number }> = [];
  editor.state.doc.descendants((n, pos) => {
    if (n.type.name === 'heading' && n.textContent.trim()) {
      headings.push({
        level: Number(n.attrs.level || 1),
        text: n.textContent.trim(),
        pos,
      });
    }
  });

  return (
    <NodeViewWrapper className="my-4 not-prose">
      <div className="rounded-2xl border border-[#ECEAF1] dark:border-[#2E2C3E] bg-[#F8F7FB] dark:bg-[#191824] p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--notely-accent)]">
            Table of Contents
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => editor.commands.focus()}
              aria-label="Refresh table of contents"
              className="p-1 text-[#92909D] hover:text-[var(--notely-accent)] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={deleteNode}
              aria-label="Remove table of contents"
              className="p-1 text-[#92909D] hover:text-[#EF4444] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {headings.length === 0 ? (
          <p className="text-xs text-[#92909D]">Add headings (H1–H6) to populate Table of Contents.</p>
        ) : (
          <ul className="space-y-1">
            {headings.map((h, i) => (
              <li key={i} style={{ paddingLeft: `${(h.level - 1) * 14}px` }}>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextSelection(h.pos + 1).run()}
                  className="text-xs font-medium text-[#24232B] dark:text-[#F4F3F8] hover:text-[var(--notely-accent)] text-left cursor-pointer"
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const TocBlock = Node.create({
  name: 'toc',
  group: 'block',
  atom: true,
  parseHTML() {
    return [{ tag: 'div[data-notely-toc]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-notely-toc': 'true' }), 'Table of Contents'];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TocNodeView);
  },
});

/* 6. Page Break Node */
function PageBreakNodeView({ deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className="my-5 not-prose">
      <div className="flex items-center gap-3 text-[11px] font-semibold text-[#92909D]">
        <div className="flex-1 border-t border-dashed border-[#CFCAD8] dark:border-[#3A374C]" />
        <span>Page Break</span>
        <button
          type="button"
          onClick={deleteNode}
          aria-label="Remove page break"
          className="text-[#92909D] hover:text-[#EF4444] cursor-pointer"
        >
          ×
        </button>
        <div className="flex-1 border-t border-dashed border-[#CFCAD8] dark:border-[#3A374C]" />
      </div>
    </NodeViewWrapper>
  );
}

export const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  parseHTML() {
    return [{ tag: 'div[data-notely-pagebreak]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-notely-pagebreak': 'true' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PageBreakNodeView);
  },
});

/* 6b. Section Break Node */
function SectionBreakNodeView({ deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className="my-5 not-prose">
      <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--notely-accent)]">
        <div className="flex-1 border-t-2 border-double border-[var(--notely-accent)]/50" />
        <span>Section Break</span>
        <button
          type="button"
          onClick={deleteNode}
          aria-label="Remove section break"
          className="text-[#92909D] hover:text-[#EF4444] cursor-pointer"
        >
          ×
        </button>
        <div className="flex-1 border-t-2 border-double border-[var(--notely-accent)]/50" />
      </div>
    </NodeViewWrapper>
  );
}

export const SectionBreakNode = Node.create({
  name: 'sectionBreak',
  group: 'block',
  atom: true,
  parseHTML() {
    return [{ tag: 'div[data-notely-sectionbreak]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-notely-sectionbreak': 'true' }),
      'Section Break',
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SectionBreakNodeView);
  },
});

/* 7. Callout / Text Box / Shape Block */
function CalloutNodeView({ node, deleteNode }: NodeViewProps) {
  const colorKey = (node.attrs.color as keyof typeof CARD_COLORS) || 'purple';
  const c = CARD_COLORS[colorKey] ?? CARD_COLORS.purple;
  const label = String(node.attrs.label || 'Text Box');
  const text = String(node.attrs.text || '');
  return (
    <NodeViewWrapper className="my-3 not-prose">
      <div
        className="rounded-2xl p-4 border flex items-start justify-between gap-3"
        style={{ backgroundColor: c.lightHex, borderColor: `${c.hex}44`, color: '#24232B' }}
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: c.hex }}>
            {label}
          </div>
          <div className="text-sm font-medium">{text}</div>
        </div>
        <button
          type="button"
          onClick={deleteNode}
          aria-label="Remove text box"
          className="p-1 text-[#716F7D] hover:text-[#EF4444] cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const CalloutBlock = Node.create({
  name: 'callout',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      label: { default: 'Note Box' },
      text: { default: '' },
      color: { default: 'purple' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-notely-callout]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-notely-callout': 'true' }), HTMLAttributes.text || ''];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },
});

/* 8. Audio Recording / Attachment Node */
function AudioNodeView({ node, deleteNode }: NodeViewProps) {
  const src = String(node.attrs.src || '');
  const title = String(node.attrs.title || 'Audio Recording');
  return (
    <NodeViewWrapper className="my-3 not-prose">
      <div className="rounded-2xl border border-[#ECEAF1] dark:border-[#2E2C3E] bg-[#F8F7FB] dark:bg-[#191824] p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--notely-accent-light)] text-[var(--notely-accent)] flex items-center justify-center shrink-0">
          <Volume2 className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-[#24232B] dark:text-[#F4F3F8] truncate mb-1">
            {title}
          </div>
          {src ? (
            <audio controls src={src} className="w-full h-8" />
          ) : (
            <div className="text-xs text-[#92909D]">Attachment saved</div>
          )}
        </div>
        <button
          type="button"
          onClick={deleteNode}
          aria-label="Remove audio"
          className="p-1.5 text-[#92909D] hover:text-[#EF4444] cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const AudioBlock = Node.create({
  name: 'audioBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: '' },
      title: { default: 'Audio Memo' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-notely-audio]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-notely-audio': 'true' }), HTMLAttributes.title || 'Audio'];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView);
  },
});

/* 9. Inline Bookmark Pill */
function BookmarkNodeView({ node, deleteNode }: NodeViewProps) {
  const name = String(node.attrs.name || 'Bookmark');
  return (
    <NodeViewWrapper as="span" className="inline-flex items-center mx-1 align-middle">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FCE8F3] text-[#EC4899] text-xs font-semibold">
        <Bookmark className="w-3 h-3" />
        {name}
        <button
          type="button"
          onClick={deleteNode}
          aria-label={`Remove bookmark ${name}`}
          className="ml-0.5 hover:text-[#BE185D] cursor-pointer"
        >
          ×
        </button>
      </span>
    </NodeViewWrapper>
  );
}

export const BookmarkNode = Node.create({
  name: 'bookmark',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      name: { default: 'Bookmark' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-notely-bookmark]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-notely-bookmark': 'true' }), HTMLAttributes.name || 'Bookmark'];
  },
  addNodeView() {
    return ReactNodeViewRenderer(BookmarkNodeView);
  },
});
