import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bookmark,
  Calculator,
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Hash,
  Image as ImageIcon,
  Link2,
  ListTree,
  MessageSquare,
  Mic,
  Minus,
  PenTool,
  ScanLine,
  Scissors,
  SeparatorHorizontal,
  Shapes,
  Sparkles,
  Square,
  Table2,
  Type,
} from 'lucide-react';
import { BottomSheet } from '../DesignSystem';

export type InsertActionType =
  | 'image-gallery'
  | 'image-camera'
  | 'table'
  | 'drawing'
  | 'chart'
  | 'link'
  | 'comment'
  | 'divider'
  | 'footnote'
  | 'symbols'
  | 'equation'
  | 'contents'
  | 'bookmark'
  | 'shape'
  | 'textbox'
  | 'header-footer'
  | 'page-number'
  | 'date'
  | 'time'
  | 'signature'
  | 'watermark'
  | 'page-break'
  | 'section-break'
  | 'audio'
  | 'scanner';

export function InsertMenuSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (action: InsertActionType) => void;
}) {
  const [imageExpanded, setImageExpanded] = useState(false);

  const primaryTiles: Array<{
    id: InsertActionType;
    title: string;
    desc: string;
    bg: string;
    fg: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'table',
      title: 'Table',
      desc: 'Rows & columns',
      bg: '#F0E9FF',
      fg: '#8950F5',
      icon: <Table2 className="w-5 h-5" />,
    },
    {
      id: 'drawing',
      title: 'Drawing',
      desc: 'Sketch & ink',
      bg: '#EAF3FF',
      fg: '#3B82F6',
      icon: <PenTool className="w-5 h-5" />,
    },
    {
      id: 'chart',
      title: 'Chart',
      desc: 'Graphs from data',
      bg: '#E8F8F0',
      fg: '#22C55E',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'link',
      title: 'Link',
      desc: 'Hyperlink text',
      bg: '#FFF6D9',
      fg: '#EAB308',
      icon: <Link2 className="w-5 h-5" />,
    },
    {
      id: 'comment',
      title: 'Comment',
      desc: 'Side note on text',
      bg: '#FCE8F3',
      fg: '#EC4899',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      id: 'divider',
      title: 'Divider',
      desc: 'Horizontal line',
      bg: '#E6FAF8',
      fg: '#14B8A6',
      icon: <Minus className="w-5 h-5" />,
    },
    {
      id: 'footnote',
      title: 'Footnote',
      desc: 'Bottom reference',
      bg: '#F0E9FF',
      fg: '#8950F5',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      id: 'symbols',
      title: 'Symbols',
      desc: 'π © → ¥ Σ',
      bg: '#EAF3FF',
      fg: '#3B82F6',
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: 'equation',
      title: 'Equation',
      desc: 'Math & science',
      bg: '#E8F8F0',
      fg: '#22C55E',
      icon: <Calculator className="w-5 h-5" />,
    },
    {
      id: 'contents',
      title: 'Contents',
      desc: 'Auto from headings',
      bg: '#FFF6D9',
      fg: '#EAB308',
      icon: <ListTree className="w-5 h-5" />,
    },
    {
      id: 'bookmark',
      title: 'Bookmark',
      desc: 'Save position',
      bg: '#FCE8F3',
      fg: '#EC4899',
      icon: <Bookmark className="w-5 h-5" />,
    },
    {
      id: 'scanner',
      title: 'Scan & OCR',
      desc: 'Paper to text',
      bg: '#FFF1E6',
      fg: '#F97316',
      icon: <ScanLine className="w-5 h-5" />,
    },
  ];

  const secondaryTools: Array<{
    id: InsertActionType;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'shape', label: 'Shapes', icon: <Shapes className="w-4 h-4" /> },
    { id: 'textbox', label: 'Text Box', icon: <Type className="w-4 h-4" /> },
    { id: 'header-footer', label: 'Header / Footer', icon: <FileText className="w-4 h-4" /> },
    { id: 'page-number', label: 'Page Number', icon: <Hash className="w-4 h-4" /> },
    { id: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" /> },
    { id: 'time', label: 'Time', icon: <Clock className="w-4 h-4" /> },
    { id: 'signature', label: 'Signature', icon: <PenTool className="w-4 h-4" /> },
    { id: 'watermark', label: 'Watermark', icon: <Square className="w-4 h-4" /> },
    { id: 'page-break', label: 'Page Break', icon: <Scissors className="w-4 h-4" /> },
    { id: 'section-break', label: 'Section Break', icon: <SeparatorHorizontal className="w-4 h-4" /> },
    { id: 'audio', label: 'Audio Memo', icon: <Mic className="w-4 h-4" /> },
  ];

  const trigger = (id: InsertActionType) => {
    onClose();
    onSelect(id);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Insert">
      <div className="space-y-4 pb-2">
        {/* Featured Image Row matching Reference 3 */}
        <div className="notely-card rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setImageExpanded((e) => !e)}
            className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FCE8F3] text-[#EC4899] flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">Image</div>
                <div className="text-xs text-[#92909D]">From gallery or camera</div>
              </div>
            </div>
            {imageExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#92909D]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#92909D]" />
            )}
          </button>
          {imageExpanded && (
            <div className="px-3.5 pb-3.5 pt-1 grid grid-cols-2 gap-2 border-t border-[#ECEAF1] dark:border-[#2A2838]">
              <button
                type="button"
                onClick={() => trigger('image-gallery')}
                className="h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-[#EC4899]" />
                Choose from Gallery
              </button>
              <button
                type="button"
                onClick={() => trigger('image-camera')}
                className="h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#8950F5]" />
                Capture Camera
              </button>
            </div>
          )}
        </div>

        {/* 3-Column Grid matching Reference 3 */}
        <div className="grid grid-cols-3 gap-2.5">
          {primaryTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => trigger(tile.id)}
              className="notely-card rounded-2xl p-3 flex flex-col items-start text-left hover:border-[var(--notely-accent)]/50 transition-colors cursor-pointer"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5"
                style={{ backgroundColor: tile.bg, color: tile.fg }}
              >
                {tile.icon}
              </div>
              <div className="text-[13px] font-bold text-[#24232B] dark:text-[#F4F3F8] leading-tight">
                {tile.title}
              </div>
              <div className="text-[11px] text-[#92909D] mt-0.5 leading-tight line-clamp-2">
                {tile.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Additional Document Tools */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#92909D]">
            More Document Elements
          </div>
          <div className="flex flex-wrap gap-2">
            {secondaryTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => trigger(tool.id)}
                className="px-3 py-2 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] hover:bg-[#EAE7F3] dark:hover:bg-[#312E42] text-xs font-semibold text-[#24232B] dark:text-[#F4F3F8] flex items-center gap-1.5 cursor-pointer"
              >
                <span className="text-[var(--notely-accent)]">{tool.icon}</span>
                {tool.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
