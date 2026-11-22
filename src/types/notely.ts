export type ThemeMode = 'light' | 'dark' | 'system';

export type AccentColorKey = 'purple' | 'green' | 'blue' | 'yellow';

export type CardColorKey =
  | 'purple'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'pink'
  | 'red'
  | 'teal'
  | 'orange';

export type NotebookIconKey =
  | 'book'
  | 'briefcase'
  | 'lightbulb'
  | 'graduation'
  | 'folder'
  | 'heart'
  | 'star'
  | 'code'
  | 'compass'
  | 'layers';

export type PaperSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Custom';
export type PageOrientation = 'portrait' | 'landscape';
export type MarginPreset = 'normal' | 'narrow' | 'moderate' | 'wide' | 'custom';

export interface PageSetup {
  orientation: PageOrientation;
  paperSize: PaperSize;
  customWidthMm?: number;
  customHeightMm?: number;
  marginPreset: MarginPreset;
  marginsMm: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  pageColor: string;
  showPageBorder: boolean;
  borderColor: string;
  headerText: string;
  footerText: string;
  headerPosition: 'left' | 'center' | 'right';
  footerPosition: 'left' | 'center' | 'right';
  showPageNumbers: boolean;
  differentFirstPage: boolean;
  watermarkText?: string;
}

export interface EditorPreferences {
  spellingAndGrammar: boolean;
  autoSave: boolean;
  versionHistory: boolean;
  defaultFont: string;
  defaultFontSize: number;
  defaultTextStyle: 'paragraph' | 'h1' | 'h2' | 'h3';
  defaultParagraphSpacing: number;
  defaultLineSpacing: number;
  autoFormatting: boolean;
}

export interface SecurityPreferences {
  appLockEnabled: boolean;
  pinHash: string | null;
  biometricEnabled: boolean;
  lockedDocumentIds: string[];
  lockedNotebookIds: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  workspaceName: string;
  workspaceDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: ThemeMode;
  accentColor: AccentColorKey;
  editorPreferences: EditorPreferences;
  securityPreferences: SecurityPreferences;
  cloudSyncEnabled: boolean;
  lastSyncedAt: string | null;
}

export interface Notebook {
  id: string;
  name: string;
  description: string;
  icon: NotebookIconKey;
  color: CardColorKey;
  ownerId: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface StructuredContent {
  type: string;
  content?: StructuredNode[];
  [key: string]: unknown;
}

export interface StructuredNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: StructuredNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  notebookId: string;
  ownerId: string;
  content: StructuredContent;
  htmlCache: string;
  plainTextCache: string;
  documentSchemaVersion: number;
  pageSetup: PageSetup;
  editorStyle?: {
    fontFamily?: string;
    fontSizePx?: number;
    lineHeight?: number;
    paragraphSpacingPx?: number;
  };
  cardColor: CardColorKey;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isLocked: boolean;
  encryptedPayload?: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: 'local' | 'synced' | 'pending' | 'conflict';
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  contentSnapshot: StructuredContent;
  htmlSnapshot: string;
  titleSnapshot: string;
  versionLabel: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: CardColorKey;
}

export interface DocumentCommentReply {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  content: string;
  anchorText: string;
  resolved: boolean;
  replies: DocumentCommentReply[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentBookmark {
  id: string;
  documentId: string;
  name: string;
  anchorReference: string;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  documentId: string;
  mediaType: 'image' | 'drawing' | 'audio' | 'scan' | 'attachment';
  localPath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  permission: 'view' | 'edit';
  isPublic: boolean;
  shareToken: string;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: CardColorKey;
  isCustom: boolean;
  content: StructuredContent;
  htmlContent: string;
  createdAt: string;
}

export interface ChartDataRow {
  label: string;
  value: number;
  color?: string;
}

export interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'doughnut';
  title: string;
  rows: ChartDataRow[];
  palette: CardColorKey;
}

export interface DocumentStats {
  words: number;
  characters: number;
  charactersWithoutSpaces: number;
  sentences: number;
  paragraphs: number;
  pages: number;
}

export interface TocHeading {
  id: string;
  level: number;
  text: string;
  index: number;
}

export interface SpellingIssue {
  id: string;
  type: 'spelling' | 'grammar';
  word: string;
  context: string;
  message: string;
  suggestions: string[];
  index: number;
}

export interface FindMatch {
  index: number;
  length: number;
  excerpt: string;
}

export type AppRoute =
  | { name: 'home' }
  | { name: 'notebooks' }
  | { name: 'notebook-detail'; notebookId: string }
  | { name: 'settings' }
  | { name: 'editor'; documentId: string }
  | { name: 'collection'; filter: 'all' | 'recent' | 'starred' | 'pinned' | 'archived' | 'trash' }
  | { name: 'templates' }
  | { name: 'search'; initialQuery?: string };

export type NotebookSortOption =
  | 'updated-desc'
  | 'created-desc'
  | 'title-asc'
  | 'title-desc'
  | 'oldest-first'
  | 'newest-first';

export type NotebookFilterOption = 'all' | 'pinned' | 'favorite' | 'recent' | 'archived';

export const DEFAULT_PAGE_SETUP: PageSetup = {
  orientation: 'portrait',
  paperSize: 'A4',
  marginPreset: 'normal',
  marginsMm: { top: 25, right: 25, bottom: 25, left: 25 },
  pageColor: '#FFFFFF',
  showPageBorder: false,
  borderColor: '#ECEAF1',
  headerText: '',
  footerText: '',
  headerPosition: 'center',
  footerPosition: 'center',
  showPageNumbers: false,
  differentFirstPage: false,
  watermarkText: '',
};

export const DEFAULT_EDITOR_PREFS: EditorPreferences = {
  spellingAndGrammar: true,
  autoSave: true,
  versionHistory: true,
  defaultFont: 'Plus Jakarta Sans',
  defaultFontSize: 16,
  defaultTextStyle: 'paragraph',
  defaultParagraphSpacing: 12,
  defaultLineSpacing: 1.6,
  autoFormatting: true,
};

export const CARD_COLORS: Record<
  CardColorKey,
  { hex: string; lightHex: string; darkTint: string; label: string }
> = {
  purple: { hex: '#8950F5', lightHex: '#F0E9FF', darkTint: '#2C214A', label: 'Purple' },
  blue: { hex: '#3B82F6', lightHex: '#EAF3FF', darkTint: '#1C2E4A', label: 'Blue' },
  green: { hex: '#22C55E', lightHex: '#E8F8F0', darkTint: '#183629', label: 'Green' },
  yellow: { hex: '#EAB308', lightHex: '#FFF6D9', darkTint: '#3B3014', label: 'Yellow' },
  pink: { hex: '#EC4899', lightHex: '#FCE8F3', darkTint: '#3D1B30', label: 'Pink' },
  red: { hex: '#EF4444', lightHex: '#FEECEC', darkTint: '#3E1B1E', label: 'Red' },
  teal: { hex: '#14B8A6', lightHex: '#E6FAF8', darkTint: '#163634', label: 'Teal' },
  orange: { hex: '#F97316', lightHex: '#FFF1E6', darkTint: '#3D2514', label: 'Orange' },
};

export const ACCENT_COLORS: Record<
  AccentColorKey,
  { primary: string; deep: string; light: string; label: string }
> = {
  purple: { primary: '#8950F5', deep: '#7040E8', light: '#F0E9FF', label: 'Purple' },
  green: { primary: '#39B980', deep: '#289B67', light: '#E8F8F0', label: 'Green' },
  blue: { primary: '#438CEB', deep: '#2B72D1', light: '#EAF3FF', label: 'Blue' },
  yellow: { primary: '#EAB308', deep: '#CA8A04', light: '#FFF6D9', label: 'Yellow' },
};
