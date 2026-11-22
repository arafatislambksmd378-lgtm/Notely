import React from 'react';
import {
  BookOpen,
  Briefcase,
  Check,
  Code2,
  Compass,
  Folder,
  GraduationCap,
  Heart,
  Layers,
  Lightbulb,
  Pin,
  Search,
  Star,
  X,
  Lock,
} from 'lucide-react';
import {
  CARD_COLORS,
  type CardColorKey,
  type DocumentRecord,
  type Notebook,
  type NotebookIconKey,
} from '../types/notely';
import { formatRelativeTime } from '../utils/documentUtils';

export function NotebookGlyph({
  icon,
  className = 'w-5 h-5',
}: {
  icon: NotebookIconKey;
  className?: string;
}) {
  switch (icon) {
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'lightbulb':
      return <Lightbulb className={className} />;
    case 'graduation':
      return <GraduationCap className={className} />;
    case 'folder':
      return <Folder className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'code':
      return <Code2 className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'book':
    default:
      return <BookOpen className={className} />;
  }
}

export function AppButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--notely-accent)]';
  const sizes = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-base',
  };
  const variants = {
    primary: 'bg-[var(--notely-accent)] hover:bg-[var(--notely-accent-deep)] text-white shadow-sm',
    secondary:
      'bg-[#F4F3F8] dark:bg-[#242232] text-[#24232B] dark:text-[#F4F3F8] hover:bg-[#EAE7F3] dark:hover:bg-[#2E2C3E]',
    outline:
      'border border-[var(--notely-accent)] text-[var(--notely-accent)] bg-white dark:bg-[#1B1A26] hover:bg-[var(--notely-accent-light)] dark:hover:bg-[#2A2242]',
    danger: 'bg-[#EF4444] hover:bg-[#DC2626] text-white',
    ghost: 'text-[#5C5A68] dark:text-[#B2B0BE] hover:bg-[#F4F3F8] dark:hover:bg-[#242232]',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function IconButton({
  children,
  label,
  active = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--notely-accent)] ${
        active
          ? 'bg-[var(--notely-accent-light)] dark:bg-[#2D234A] text-[var(--notely-accent)]'
          : 'bg-[#F4F3F8] dark:bg-[#242232] text-[#24232B] dark:text-[#F4F3F8] hover:bg-[#EAE7F3] dark:hover:bg-[#2E2C3E]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onFocus,
  placeholder = 'Search notes, tables, ideas...',
  autoFocus = false,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className="relative flex items-center w-full"
    >
      <Search className="w-4.5 h-4.5 text-[#92909D] absolute left-4 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-12 pl-11 pr-10 rounded-2xl bg-[#F4F3F8] dark:bg-[#1B1A26] border border-transparent focus:border-[var(--notely-accent)]/40 text-sm text-[#24232B] dark:text-[#F4F3F8] placeholder-[#92909D] outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 p-1.5 rounded-full text-[#92909D] hover:text-[#24232B] dark:hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}

export function NotebookCard({
  notebook,
  noteCount,
  onOpen,
  variant = 'compact',
}: {
  notebook: Notebook;
  noteCount: number;
  onOpen: () => void;
  variant?: 'compact' | 'row';
}) {
  const color = CARD_COLORS[notebook.color] ?? CARD_COLORS.purple;
  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full notely-card rounded-2xl p-4 flex items-center gap-4 text-left hover:translate-y-[-1px] transition-all cursor-pointer"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: color.lightHex, color: color.hex }}
        >
          <NotebookGlyph icon={notebook.icon} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-[#24232B] dark:text-[#F4F3F8] truncate">
            {notebook.name}
          </div>
          <div className="text-xs text-[#92909D] mt-0.5 tabular-nums">
            {noteCount} {noteCount === 1 ? 'note' : 'notes'}
          </div>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tabular-nums shrink-0"
          style={{ backgroundColor: color.lightHex, color: color.hex }}
        >
          {noteCount}
        </div>
        <span className="text-[#92909D] text-lg leading-none" aria-hidden="true">
          ›
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="notely-card rounded-2xl p-4 flex flex-col items-start text-left min-w-[136px] flex-1 hover:translate-y-[-1px] transition-all cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: color.lightHex, color: color.hex }}
      >
        <NotebookGlyph icon={notebook.icon} className="w-5 h-5" />
      </div>
      <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8] truncate w-full">
        {notebook.name}
      </div>
      <div className="text-xs text-[#92909D] mt-0.5 tabular-nums">
        {noteCount} {noteCount === 1 ? 'note' : 'notes'}
      </div>
    </button>
  );
}

export function NoteCard({
  doc,
  notebook,
  onOpen,
}: {
  doc: DocumentRecord;
  notebook?: Notebook;
  onOpen: () => void;
}) {
  const color = CARD_COLORS[doc.cardColor] ?? CARD_COLORS.purple;
  const nbColor = notebook ? CARD_COLORS[notebook.color] : color;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="notely-card rounded-3xl overflow-hidden text-left flex flex-col justify-between h-full hover:translate-y-[-2px] transition-all cursor-pointer group"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: color.hex }} />
      <div className="p-4 flex-1 flex flex-col justify-between gap-3 w-full">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-bold text-[#24232B] dark:text-[#F4F3F8] leading-snug line-clamp-2">
              {doc.title || 'Untitled Note'}
            </h3>
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              {doc.isLocked && <Lock className="w-3.5 h-3.5 text-[#92909D]" aria-label="Locked note" />}
              {doc.isFavorite && (
                <Star className="w-3.5 h-3.5 text-[#EAB308] fill-[#EAB308]" aria-label="Starred" />
              )}
              {doc.isPinned && (
                <Pin className="w-3.5 h-3.5 text-[var(--notely-accent)]" aria-label="Pinned" />
              )}
            </div>
          </div>
          <p className="text-xs text-[#6E6C7A] dark:text-[#A3A1B0] mt-1.5 line-clamp-3 leading-relaxed">
            {doc.isLocked ? 'Private encrypted note — tap to unlock' : doc.plainTextCache || 'Empty note'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1 text-[10px]">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold truncate max-w-[92px]"
            style={{ backgroundColor: nbColor.lightHex, color: nbColor.hex }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: nbColor.hex }} />
            <span className="truncate">{notebook?.name ?? 'General'}</span>
          </span>
          <span className="text-[#92909D] whitespace-nowrap shrink-0 tabular-nums">
            {formatRelativeTime(doc.updatedAt)}
          </span>
        </div>
      </div>
    </button>
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-[#1B1A26] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#ECEAF1] dark:border-[#2A2838] max-h-[88vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#DEDCE6] dark:bg-[#38364A]" />
        </div>
        {title && (
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#ECEAF1] dark:border-[#2A2838] shrink-0">
            <h2 className="text-lg font-bold text-[#24232B] dark:text-[#F4F3F8]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="w-9 h-9 rounded-full bg-[#F4F3F8] dark:bg-[#262434] flex items-center justify-center text-[#5C5A68] dark:text-[#B2B0BE] hover:bg-[#EAE7F3] dark:hover:bg-[#312E42] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <p className="text-sm text-[#5C5A68] dark:text-[#B2B0BE] leading-relaxed mb-5">{message}</p>
      <div className="flex items-center justify-end gap-2.5">
        <AppButton variant="secondary" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </AppButton>
      </div>
    </BottomSheet>
  );
}

export function ColorSwatchPicker({
  selected,
  onSelect,
}: {
  selected: CardColorKey;
  onSelect: (color: CardColorKey) => void;
}) {
  const keys = Object.keys(CARD_COLORS) as CardColorKey[];
  return (
    <div className="flex items-center justify-between gap-1.5 sm:justify-start sm:gap-2.5">
      {keys.map((key) => {
        const c = CARD_COLORS[key];
        const isActive = key === selected;
        return (
          <button
            key={key}
            type="button"
            aria-label={`Select ${c.label} color`}
            onClick={() => onSelect(key)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0 cursor-pointer"
            style={{
              backgroundColor: c.hex,
              boxShadow: isActive ? `0 0 0 2px #fff, 0 0 0 4px ${c.hex}` : undefined,
            }}
          >
            {isActive && <Check className="w-4 h-4 text-white stroke-[3]" />}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsTile({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const TagEl = onClick ? 'button' : 'div';
  return (
    <TagEl
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left ${
        onClick ? 'hover:bg-[#F8F7FB] dark:hover:bg-[#232131] transition-colors cursor-pointer' : ''
      }`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-[#24232B] dark:text-[#F4F3F8] truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-[#92909D] mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </TagEl>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="notely-card rounded-3xl p-8 flex flex-col items-center text-center max-w-md mx-auto my-6">
      <div className="w-14 h-14 rounded-2xl bg-[var(--notely-accent-light)] dark:bg-[#282242] text-[var(--notely-accent)] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-[#24232B] dark:text-[#F4F3F8]">{title}</h3>
      <p className="text-xs text-[#92909D] mt-1.5 leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingIndicator({ label = 'Loading Notely workspace...' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#0E0D14]">
      <div className="w-12 h-12 rounded-2xl bg-[var(--notely-accent)] flex items-center justify-center text-white shadow-lg animate-pulse">
        <BookOpen className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium text-[#92909D]">{label}</p>
    </div>
  );
}
