import React from 'react';
import {
  Archive,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  FileText,
  FolderInput,
  Lock,
  MessageSquare,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  Tag,
  Trash2,
} from 'lucide-react';
import { BottomSheet, ColorSwatchPicker } from '../DesignSystem';
import type { CardColorKey, DocumentRecord } from '../../types/notely';

export type NoteOptionAction =
  | 'page-setup'
  | 'find-replace'
  | 'word-count'
  | 'spelling'
  | 'version-history'
  | 'comments'
  | 'bookmarks'
  | 'move'
  | 'share-export'
  | 'copy'
  | 'rename'
  | 'archive'
  | 'delete'
  | 'tags'
  | 'favorite'
  | 'lock';

export function NoteOptionsSheet({
  open,
  onClose,
  doc,
  onColorChange,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  doc: DocumentRecord;
  onColorChange: (color: CardColorKey) => void;
  onAction: (action: NoteOptionAction) => void;
}) {
  const rows: Array<{
    id: NoteOptionAction;
    label: string;
    bg: string;
    fg: string;
    icon: React.ReactNode;
    danger?: boolean;
  }> = [
    {
      id: 'page-setup',
      label: 'Page setup',
      bg: '#EAF3FF',
      fg: '#3B82F6',
      icon: <FileText className="w-4.5 h-4.5" />,
    },
    {
      id: 'find-replace',
      label: 'Find and replace',
      bg: '#F0E9FF',
      fg: '#8950F5',
      icon: <Search className="w-4.5 h-4.5" />,
    },
    {
      id: 'word-count',
      label: 'Word count',
      bg: '#E8F8F0',
      fg: '#22C55E',
      icon: <SlidersHorizontal className="w-4.5 h-4.5" />,
    },
    {
      id: 'spelling',
      label: 'Spelling and grammar',
      bg: '#FFF6D9',
      fg: '#EAB308',
      icon: <CheckCircle2 className="w-4.5 h-4.5" />,
    },
    {
      id: 'version-history',
      label: 'Version history',
      bg: '#FCE8F3',
      fg: '#EC4899',
      icon: <Clock className="w-4.5 h-4.5" />,
    },
    {
      id: 'comments',
      label: 'Comments',
      bg: '#EAF3FF',
      fg: '#3B82F6',
      icon: <MessageSquare className="w-4.5 h-4.5" />,
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      bg: '#F0E9FF',
      fg: '#8950F5',
      icon: <Bookmark className="w-4.5 h-4.5" />,
    },
    {
      id: 'tags',
      label: 'Tags',
      bg: '#E6FAF8',
      fg: '#14B8A6',
      icon: <Tag className="w-4.5 h-4.5" />,
    },
    {
      id: 'favorite',
      label: doc.isFavorite ? 'Remove from Starred' : 'Add to Starred',
      bg: '#FFF6D9',
      fg: '#EAB308',
      icon: <Star className="w-4.5 h-4.5" />,
    },
    {
      id: 'move',
      label: 'Move to notebook',
      bg: '#E8F8F0',
      fg: '#22C55E',
      icon: <FolderInput className="w-4.5 h-4.5" />,
    },
    {
      id: 'share-export',
      label: 'Share & export',
      bg: '#F0E9FF',
      fg: '#8950F5',
      icon: <Share2 className="w-4.5 h-4.5" />,
    },
    {
      id: 'copy',
      label: 'Make a copy',
      bg: '#FFF6D9',
      fg: '#EAB308',
      icon: <Copy className="w-4.5 h-4.5" />,
    },
    {
      id: 'rename',
      label: 'Rename',
      bg: '#EAF3FF',
      fg: '#3B82F6',
      icon: <Edit3 className="w-4.5 h-4.5" />,
    },
    {
      id: 'lock',
      label: doc.isLocked ? 'Unlock private note' : 'Lock private note (AES-256)',
      bg: '#F0E9FF',
      fg: '#8950F5',
      icon: <Lock className="w-4.5 h-4.5" />,
    },
    {
      id: 'archive',
      label: doc.isArchived ? 'Unarchive note' : 'Archive',
      bg: '#FFF1E6',
      fg: '#F97316',
      icon: <Archive className="w-4.5 h-4.5" />,
    },
    {
      id: 'delete',
      label: 'Delete',
      bg: '#FEECEC',
      fg: '#EF4444',
      icon: <Trash2 className="w-4.5 h-4.5" />,
      danger: true,
    },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Note options">
      <div className="space-y-4 pb-2">
        {/* Card Color Swatches matching Reference 1 */}
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#92909D] mb-2.5">
            Card color
          </div>
          <ColorSwatchPicker selected={doc.cardColor} onSelect={onColorChange} />
        </div>

        <div className="divide-y divide-[#ECEAF1]/60 dark:divide-[#2A2838]/60">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                onClose();
                onAction(row.id);
              }}
              className="w-full py-3 flex items-center gap-3.5 text-left hover:bg-[#F8F7FB] dark:hover:bg-[#232131] rounded-xl px-1 transition-colors cursor-pointer"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: row.bg, color: row.fg }}
              >
                {row.icon}
              </div>
              <span
                className={`flex-1 text-[15px] font-semibold ${
                  row.danger ? 'text-[#EF4444]' : 'text-[#24232B] dark:text-[#F4F3F8]'
                }`}
              >
                {row.label}
              </span>
              <ChevronRight className="w-4 h-4 text-[#C2C0CC] dark:text-[#525064]" />
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
