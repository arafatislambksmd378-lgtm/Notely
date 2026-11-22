import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Brush,
  Circle,
  Eraser,
  Highlighter,
  Minus,
  Pen,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';

type DrawTool =
  | 'pen'
  | 'brush'
  | 'pencil'
  | 'highlighter'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle';

interface Point {
  x: number;
  y: number;
}

interface StrokeRecord {
  tool: DrawTool;
  color: string;
  width: number;
  points: Point[];
}

const PALETTE = [
  '#1C1B24',
  '#8950F5',
  '#3B82F6',
  '#22C55E',
  '#EAB308',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
];

export function DrawingWorkspace({
  title = 'Drawing',
  onClose,
  onInsert,
}: {
  title?: string;
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#8950F5');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [stabilization, setStabilization] = useState(true);
  const [strokes, setStrokes] = useState<StrokeRecord[]>([]);
  const [redoStack, setRedoStack] = useState<StrokeRecord[]>([]);
  const activeStrokeRef = useRef<StrokeRecord | null>(null);
  const isDrawingRef = useRef(false);

  const renderAllStrokes = (list: StrokeRecord[], preview?: StrokeRecord | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawOne = (s: StrokeRecord) => {
      if (s.points.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = s.tool === 'eraser' ? '#FFFFFF' : s.color;
      ctx.globalAlpha = s.tool === 'highlighter' ? 0.35 : s.tool === 'pencil' ? 0.78 : 1;
      ctx.lineWidth =
        s.tool === 'brush'
          ? s.width * 2
          : s.tool === 'highlighter'
            ? s.width * 3.2
            : s.tool === 'eraser'
              ? s.width * 2.5
              : s.width;

      const pts = s.points;
      if (s.tool === 'line' || s.tool === 'arrow') {
        const start = pts[0];
        const end = pts[pts.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        if (s.tool === 'arrow') {
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const headLen = Math.max(10, s.width * 3);
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - headLen * Math.cos(angle - Math.PI / 6),
            end.y - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - headLen * Math.cos(angle + Math.PI / 6),
            end.y - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      if (s.tool === 'rect') {
        const start = pts[0];
        const end = pts[pts.length - 1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        ctx.restore();
        return;
      }

      if (s.tool === 'circle') {
        const start = pts[0];
        const end = pts[pts.length - 1];
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
      }

      // Freehand stroke with optional quadratic Bezier smoothing
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 1) {
        ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
      } else if (stabilization && pts.length > 2) {
        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
      } else {
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    for (const s of list) drawOne(s);
    if (preview) drawOne(preview);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      renderAllStrokes(strokes);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    renderAllStrokes(strokes);
  }, [strokes, stabilization]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getPoint(e);
    activeStrokeRef.current = { tool, color, width: strokeWidth, points: [pt] };
    renderAllStrokes(strokes, activeStrokeRef.current);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    const pt = getPoint(e);
    activeStrokeRef.current.points.push(pt);
    renderAllStrokes(strokes, activeStrokeRef.current);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    isDrawingRef.current = false;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setStrokes((prev) => [...prev, finished]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  };

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderAllStrokes(strokes);
    onInsert(canvas.toDataURL('image/png'));
  };

  const toolButtons: Array<{ id: DrawTool; label: string; icon: React.ReactNode }> = [
    { id: 'pen', label: 'Pen', icon: <Pen className="w-4.5 h-4.5" /> },
    { id: 'brush', label: 'Brush', icon: <Brush className="w-4.5 h-4.5" /> },
    { id: 'pencil', label: 'Pencil', icon: <Pencil className="w-4.5 h-4.5" /> },
    { id: 'highlighter', label: 'Highlighter', icon: <Highlighter className="w-4.5 h-4.5" /> },
    { id: 'line', label: 'Line', icon: <Minus className="w-4.5 h-4.5" /> },
    { id: 'arrow', label: 'Arrow', icon: <ArrowUpRight className="w-4.5 h-4.5" /> },
    { id: 'rect', label: 'Rectangle', icon: <Square className="w-4.5 h-4.5" /> },
    { id: 'circle', label: 'Circle', icon: <Circle className="w-4.5 h-4.5" /> },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-4.5 h-4.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#0E0D14] flex flex-col">
      {/* Top Bar matching Reference 1 */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-[#ECEAF1] dark:border-[#2A2838] bg-white dark:bg-[#15141E] shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drawing"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[#24232B] dark:text-[#F4F3F8] hover:bg-[#F4F3F8] dark:hover:bg-[#242232] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-[#24232B] dark:text-[#F4F3F8]">{title}</h2>
        <button
          type="button"
          onClick={handleInsert}
          className="px-4 h-9 rounded-xl bg-[var(--notely-accent)] hover:bg-[var(--notely-accent-deep)] text-white text-sm font-semibold cursor-pointer"
        >
          Insert
        </button>
      </header>

      {/* Main Canvas Area */}
      <div className="relative flex-1 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          data-testid="drawing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full touch-none cursor-crosshair block"
        />

        {/* Floating Left Vertical Tool Pill matching Reference 1 */}
        <div className="absolute left-3 top-4 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-[#1B1A26]/95 border border-[#ECEAF1] dark:border-[#2A2838] shadow-lg max-h-[65vh] overflow-y-auto no-scrollbar">
          {toolButtons.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              title={t.label}
              onClick={() => setTool(t.id)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                tool === t.id
                  ? 'bg-[var(--notely-accent)] text-white shadow-sm'
                  : 'text-[#5C5A68] dark:text-[#B2B0BE] hover:bg-[#F4F3F8] dark:hover:bg-[#262436]'
              }`}
            >
              {t.icon}
            </button>
          ))}
          <div className="w-6 border-t border-[#ECEAF1] dark:border-[#2A2838] my-0.5" />
          <button
            type="button"
            aria-label="Undo stroke"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5C5A68] dark:text-[#B2B0BE] disabled:opacity-35 hover:bg-[#F4F3F8] cursor-pointer"
          >
            <Undo2 className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            aria-label="Redo stroke"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5C5A68] dark:text-[#B2B0BE] disabled:opacity-35 hover:bg-[#F4F3F8] cursor-pointer"
          >
            <Redo2 className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            aria-label="Clear canvas"
            onClick={() => {
              setStrokes([]);
              setRedoStack([]);
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#EF4444] hover:bg-[#FEECEC] cursor-pointer"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Bottom Floating Palette + Stroke Slider + Stabilization Toggle matching Reference 1 */}
        <div className="absolute left-4 right-4 bottom-4 max-w-md mx-auto rounded-3xl bg-white/95 dark:bg-[#1B1A26]/95 border border-[#ECEAF1] dark:border-[#2A2838] shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {PALETTE.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Ink color ${hex}`}
                onClick={() => setColor(hex)}
                className="w-7 h-7 rounded-full transition-transform cursor-pointer"
                style={{
                  backgroundColor: hex,
                  boxShadow: color === hex ? `0 0 0 2px #fff, 0 0 0 4px ${hex}` : undefined,
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#92909D]">−</span>
            <input
              type="range"
              min={1}
              max={20}
              value={strokeWidth}
              aria-label="Stroke width"
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="flex-1 accent-[var(--notely-accent)]"
            />
            <span className="text-sm font-bold text-[#92909D]">+</span>
            <div className="w-6 flex items-center justify-center">
              <span
                className="rounded-full inline-block"
                style={{
                  width: `${Math.min(18, Math.max(4, strokeWidth))}px`,
                  height: `${Math.min(18, Math.max(4, strokeWidth))}px`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-xs font-medium text-[#5C5A68] dark:text-[#B2B0BE]">
              Stroke stabilization
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={stabilization}
              aria-label="Toggle stroke stabilization"
              onClick={() => setStabilization((s) => !s)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                stabilization ? 'bg-[var(--notely-accent)]' : 'bg-[#DEDCE6] dark:bg-[#343245]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  stabilization ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
