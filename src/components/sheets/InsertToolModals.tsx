import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Mic,
  Plus,
  RotateCw,
  Square,
  SunMedium,
  Trash2,
  Upload,
} from 'lucide-react';
import { AppButton, BottomSheet } from '../DesignSystem';
import { validateAndNormalizeUrl } from '../../utils/documentUtils';
import type { CardColorKey, ChartConfig, ChartDataRow } from '../../types/notely';

/* 1. Table Builder Modal */
export function TableInsertModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number, withHeader: boolean) => void;
}) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeader, setWithHeader] = useState(true);

  return (
    <BottomSheet open={open} onClose={onClose} title="Insert table">
      <div className="space-y-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Rows</label>
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="w-full h-11 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Columns</label>
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="w-full h-11 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={withHeader}
            onChange={(e) => setWithHeader(e.target.checked)}
            className="accent-[var(--notely-accent)]"
          />
          Include header row
        </label>
        <div className="flex justify-end gap-2">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            onClick={() => {
              onInsert(rows, cols, withHeader);
              onClose();
            }}
          >
            Insert Table
          </AppButton>
        </div>
      </div>
    </BottomSheet>
  );
}

/* 2. Chart Builder Modal */
export function ChartBuilderModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (config: ChartConfig) => void;
}) {
  const [chartType, setChartType] = useState<ChartConfig['chartType']>('bar');
  const [title, setTitle] = useState('Quarterly Performance');
  const [palette, setPalette] = useState<CardColorKey>('purple');
  const [rows, setRows] = useState<ChartDataRow[]>([
    { label: 'Q1', value: 42 },
    { label: 'Q2', value: 68 },
    { label: 'Q3', value: 84 },
    { label: 'Q4', value: 96 },
  ]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Insert chart" maxWidth="max-w-xl">
      <div className="space-y-4 pb-2">
        <div className="grid grid-cols-5 gap-1.5">
          {(['bar', 'line', 'area', 'pie', 'doughnut'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setChartType(t)}
              className={`h-9 rounded-xl text-xs font-semibold capitalize cursor-pointer ${
                chartType === t
                  ? 'bg-[var(--notely-accent)] text-white'
                  : 'bg-[#F4F3F8] dark:bg-[#242232] text-[#5C5A68] dark:text-[#B2B0BE]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Chart title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Theme color</label>
            <select
              value={palette}
              onChange={(e) => setPalette(e.target.value as CardColorKey)}
              className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
            >
              <option value="purple">Purple</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="pink">Pink</option>
              <option value="teal">Teal</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5C5A68]">Chart Data</span>
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, { label: `Item ${prev.length + 1}`, value: 50 }])}
              className="text-xs font-semibold text-[var(--notely-accent)] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={row.label}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r))
                  )
                }
                placeholder="Label"
                className="flex-1 h-9 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
              />
              <input
                type="number"
                value={row.value}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, value: Number(e.target.value) || 0 } : r))
                  )
                }
                placeholder="Value"
                className="w-24 h-9 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove row"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-2 text-[#EF4444] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            onClick={() => {
              onInsert({ chartType, title, rows, palette });
              onClose();
            }}
          >
            Insert Chart
          </AppButton>
        </div>
      </div>
    </BottomSheet>
  );
}

/* 3. Link Insert Modal */
export function LinkInsertModal({
  open,
  onClose,
  initialText,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  initialText: string;
  onInsert: (text: string, url: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setText(initialText);
      setError('');
    }
  }, [open, initialText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateAndNormalizeUrl(url);
    if (!check.valid) {
      setError(check.error || 'Invalid URL');
      return;
    }
    onInsert(text.trim() || check.normalized, check.normalized);
    setUrl('');
    setError('');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Insert hyperlink">
      <form onSubmit={handleSubmit} className="space-y-3.5 pb-2">
        <div>
          <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Display text</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reference link"
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5C5A68] mb-1">URL</label>
          <input
            type="text"
            required
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError('');
            }}
            placeholder="https://example.com"
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
          {error && <p className="text-xs text-[#EF4444] mt-1">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit">Insert Link</AppButton>
        </div>
      </form>
    </BottomSheet>
  );
}

/* 4. Equation Editor Modal */
export function EquationModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (equation: string) => void;
}) {
  const [expr, setExpr] = useState('∫₀^∞ e^(-x²) dx = √π / 2');

  const snippets = [
    { label: 'Fraction', token: '(a / b)' },
    { label: 'Power', token: 'x²' },
    { label: 'Root', token: '√(x)' },
    { label: 'Sum', token: '∑_{i=1}^n ' },
    { label: 'Integral', token: '∫_a^b ' },
    { label: 'Subscript', token: 'x₀' },
    { label: '±', token: ' ± ' },
    { label: '≈', token: ' ≈ ' },
    { label: '≤', token: ' ≤ ' },
    { label: '≥', token: ' ≥ ' },
    { label: 'π', token: 'π' },
    { label: 'θ', token: 'θ' },
    { label: 'λ', token: 'λ' },
    { label: 'Δ', token: 'Δ' },
    { label: '∞', token: '∞' },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Equation editor">
      <div className="space-y-4 pb-2">
        <div className="p-4 rounded-2xl bg-[#F8F7FB] dark:bg-[#242232] text-center font-editorial text-lg">
          {expr || 'Preview'}
        </div>
        <input
          type="text"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          aria-label="Equation expression"
          className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm font-mono-tabular"
        />
        <div className="flex flex-wrap gap-1.5">
          {snippets.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setExpr((prev) => prev + s.token)}
              className="px-2.5 py-1.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold hover:bg-[var(--notely-accent-light)] cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            onClick={() => {
              if (expr.trim()) onInsert(expr.trim());
              onClose();
            }}
          >
            Insert Equation
          </AppButton>
        </div>
      </div>
    </BottomSheet>
  );
}

/* 5. Special Characters Picker */
export function SymbolsModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (symbol: string) => void;
}) {
  const [query, setQuery] = useState('');
  const groups = [
    { name: 'Math', chars: ['±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '√', '∑', '∏', '∫', '∂', '∇', '∈', '∀'] },
    { name: 'Greek', chars: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'σ', 'φ', 'ω', 'Δ', 'Σ', 'Φ', 'Ω'] },
    { name: 'Currency', chars: ['$', '€', '£', '¥', '₹', '₩', '₿', '¢'] },
    { name: 'Arrows', chars: ['←', '→', '↑', '↓', '↔', '⇒', '⇐', '⇔', '↗', '↘'] },
    { name: 'Punctuation & Tech', chars: ['©', '®', '™', '§', '¶', '†', '‡', '•', '…', '—', '°', '′', '″', '✓', '✕'] },
    { name: 'Super & Subscripts', chars: ['⁰', '¹', '²', '³', '⁴', '⁵', '₀', '₁', '₂', '₃', 'ₙ', 'ᵢ'] },
  ];

  const filteredGroups = groups.filter(
    (g) => !query.trim() || g.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Special characters">
      <div className="space-y-4 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter category (Math, Greek, Currency, Arrows)..."
          className="w-full h-10 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
        />
        {filteredGroups.map((g) => (
          <div key={g.name} className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase text-[#92909D]">{g.name}</div>
            <div className="grid grid-cols-8 gap-1.5">
              {g.chars.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    onInsert(ch);
                    onClose();
                  }}
                  className="h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] hover:bg-[var(--notely-accent-light)] text-base font-medium cursor-pointer"
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

/* 6. Document Scanner & OCR Modal */
export function ScannerModal({
  open,
  onClose,
  onInsertScan,
}: {
  open: boolean;
  onClose: () => void;
  onInsertScan: (dataUrl: string, extractedText: string) => void;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [enhanced, setEnhanced] = useState(true);
  const [ocrText, setOcrText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(String(reader.result));
      setOcrText(`Scanned document (${file.name}) — review or type recognized text below.`);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const swap = rotation % 180 !== 0;
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (enhanced) {
        ctx.filter = 'contrast(1.35) brightness(1.06) grayscale(0.2)';
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      onInsertScan(canvas.toDataURL('image/jpeg', 0.9), ocrText.trim());
      setImageSrc(null);
      setRotation(0);
      setOcrText('');
      onClose();
    };
    img.src = imageSrc;
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Document scanner & OCR">
      <div className="space-y-4 pb-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {!imageSrc ? (
          <div className="notely-card rounded-2xl p-6 text-center space-y-3">
            <Camera className="w-8 h-8 mx-auto text-[var(--notely-accent)]" />
            <div className="text-sm font-bold">Capture or choose a paper document</div>
            <p className="text-xs text-[#92909D]">
              Rotate, boost contrast readability, insert the scan, and attach extracted text.
            </p>
            <AppButton onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" /> Capture / Select Scan
            </AppButton>
          </div>
        ) : (
          <>
            <div className="rounded-2xl overflow-hidden bg-[#F4F3F8] dark:bg-[#242232] flex justify-center p-2 max-h-60">
              <img
                src={imageSrc}
                alt="Scanned preview"
                className="max-h-56 object-contain transition-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  filter: enhanced ? 'contrast(1.35) brightness(1.06) grayscale(0.2)' : 'none',
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <AppButton
                size="sm"
                variant="secondary"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw className="w-4 h-4" /> Rotate 90°
              </AppButton>
              <AppButton
                size="sm"
                variant={enhanced ? 'primary' : 'secondary'}
                onClick={() => setEnhanced((e) => !e)}
              >
                <SunMedium className="w-4 h-4" /> Enhance Readability
              </AppButton>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C5A68] mb-1">
                Extracted OCR Text (editable)
              </label>
              <textarea
                rows={3}
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <AppButton variant="secondary" onClick={onClose}>
                Cancel
              </AppButton>
              <AppButton onClick={handleConfirm}>Insert Scan &amp; Text</AppButton>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/* 7. Audio Recording Modal */
export function AudioRecorderModal({
  open,
  onClose,
  onInsertAudio,
}: {
  open: boolean;
  onClose: () => void;
  onInsertAudio: (dataUrl: string, title: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [label, setLabel] = useState('Voice Memo');
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRec = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => setAudioUrl(String(reader.result));
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError('Microphone permission unavailable in this environment. You can attach an audio file instead.');
    }
  };

  const stopRec = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const handleAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLabel(file.name);
    const reader = new FileReader();
    reader.onload = () => setAudioUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Audio recording">
      <div className="space-y-4 pb-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          aria-label="Audio label"
          className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
        />

        <div className="flex flex-wrap items-center gap-2">
          {!recording ? (
            <AppButton onClick={startRec}>
              <Mic className="w-4 h-4" /> Start Recording
            </AppButton>
          ) : (
            <AppButton variant="danger" onClick={stopRec}>
              <Square className="w-4 h-4" /> Stop Recording
            </AppButton>
          )}
          <label className="px-4 h-11 rounded-2xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> Attach Audio File
            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioFile} />
          </label>
        </div>

        {error && <p className="text-xs text-[#EF4444]">{error}</p>}
        {audioUrl && <audio controls src={audioUrl} className="w-full" />}

        <div className="flex justify-end gap-2">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            disabled={!audioUrl}
            onClick={() => {
              if (audioUrl) {
                onInsertAudio(audioUrl, label);
                setAudioUrl(null);
                onClose();
              }
            }}
          >
            Insert Audio
          </AppButton>
        </div>
      </div>
    </BottomSheet>
  );
}
