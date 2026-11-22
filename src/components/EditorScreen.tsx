import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Bookmark,
  CheckSquare,
  ChevronDown,
  ClipboardPaste,
  Copy,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  Indent,
  Italic,
  List,
  ListOrdered,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Outdent,
  Pin,
  Plus,
  Redo2,
  Scissors,
  Search,
  Share2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { useNotely } from '../context/NotelyContext';
import {
  AudioBlock,
  BookmarkNode,
  CalloutBlock,
  ChartBlock,
  DrawingBlock,
  EquationBlock,
  FootnoteNode,
  PageBreakNode,
  SectionBreakNode,
  TocBlock,
} from './editor/tiptapExtensions';
import { InsertMenuSheet, type InsertActionType } from './sheets/InsertMenuSheet';
import { NoteOptionsSheet, type NoteOptionAction } from './sheets/NoteOptionsSheet';
import { ShareExportSheet } from './sheets/ShareExportSheet';
import { DrawingWorkspace } from './sheets/DrawingWorkspace';
import {
  CommentsModal,
  FindReplaceModal,
  PageSetupModal,
  SpellingGrammarModal,
  VersionHistoryModal,
  WordCountModal,
} from './sheets/ReviewModals';
import {
  AudioRecorderModal,
  ChartBuilderModal,
  EquationModal,
  LinkInsertModal,
  ScannerModal,
  SymbolsModal,
  TableInsertModal,
} from './sheets/InsertToolModals';
import { AppButton, BottomSheet, ConfirmationDialog, EmptyState } from './DesignSystem';
import { extractPlainText, transformTextCase } from '../utils/documentUtils';
import { getPaperDimensionsMm, importDocumentFile } from '../utils/exportEngine';
import type { ChartConfig, DocumentRecord, StructuredContent } from '../types/notely';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function EditorScreen({ documentId }: { documentId: string }) {
  const {
    documents,
    notebooks,
    comments,
    bookmarks,
    tags,
    settings,
    isOnline,
    goBack,
    navigate,
    saveDocument,
    duplicateDocument,
    moveDocument,
    trashDocument,
    addBookmark,
    deleteBookmark,
    renameBookmark,
    toggleDocumentTag,
    recordMediaAsset,
    toggleDocumentLock,
    unlockPrivateDocument,
    showToast,
  } = useNotely();

  const doc = documents.find((d) => d.id === documentId);
  const [title, setTitle] = useState(doc?.title ?? '');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline' | 'pending'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>(
    doc ? new Date(doc.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
  );

  // Sheet & modal states
  const [insertOpen, setInsertOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [formatSheetOpen, setFormatSheetOpen] = useState(false);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [textColorMenuOpen, setTextColorMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);

  const [drawingOpen, setDrawingOpen] = useState(false);
  const [drawingTitle, setDrawingTitle] = useState('Drawing');
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [equationModalOpen, setEquationModalOpen] = useState(false);
  const [symbolsModalOpen, setSymbolsModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);

  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [wordCountOpen, setWordCountOpen] = useState(false);
  const [spellingOpen, setSpellingOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lockPromptOpen, setLockPromptOpen] = useState(false);
  const [lockPassphrase, setLockPassphrase] = useState('');

  const [footnotePromptOpen, setFootnotePromptOpen] = useState(false);
  const [footnoteText, setFootnoteText] = useState('');
  const [editingFootnote, setEditingFootnote] = useState<{
    pos: number;
    number: number;
    text: string;
  } | null>(null);
  const [bookmarkPromptOpen, setBookmarkPromptOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingBookmarkName, setEditingBookmarkName] = useState('');
  const [calloutPromptOpen, setCalloutPromptOpen] = useState(false);
  const [calloutText, setCalloutText] = useState('');
  const [calloutLabel, setCalloutLabel] = useState('Note Box');

  const [isListening, setIsListening] = useState(false);
  const [fontFamilyVal, setFontFamilyVal] = useState(
    doc?.editorStyle?.fontFamily || settings.editorPreferences.defaultFont || 'Plus Jakarta Sans'
  );
  const [fontSizePx, setFontSizePx] = useState(
    doc?.editorStyle?.fontSizePx || settings.editorPreferences.defaultFontSize || 16
  );
  const [lineHeightVal, setLineHeightVal] = useState(
    doc?.editorStyle?.lineHeight || settings.editorPreferences.defaultLineSpacing || 1.6
  );
  const [paragraphSpacingPx, setParagraphSpacingPx] = useState(
    doc?.editorStyle?.paragraphSpacingPx ?? 10
  );

  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);

  const docCommentsCount = comments.filter((c) => c.documentId === documentId && !c.resolved).length;
  const docBookmarks = bookmarks.filter((b) => b.documentId === documentId);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          link: { openOnClick: false },
        }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight.configure({ multicolor: true }),
        TextStyle,
        Color,
        FontFamily,
        Subscript,
        Superscript,
        Image.configure({ allowBase64: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({
          placeholder: 'Tap to keep writing...',
        }),
        ChartBlock,
        DrawingBlock,
        EquationBlock,
        FootnoteNode,
        TocBlock,
        PageBreakNode,
        SectionBreakNode,
        CalloutBlock,
        AudioBlock,
        BookmarkNode,
      ],
      content: doc?.content ?? { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
      editorProps: {
        attributes: {
          class: 'notely-prose min-h-[55vh] focus:outline-none',
          'data-testid': 'rich-text-editor',
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (!doc || doc.isLocked) return;
        setSaveState('saving');
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

        const json = ed.getJSON() as StructuredContent;
        const html = ed.getHTML();
        const plain = extractPlainText(json);

        const delay = settings.editorPreferences.autoSave ? 320 : 1200;
        saveTimerRef.current = window.setTimeout(async () => {
          await saveDocument(
            doc.id,
            {
              content: json,
              htmlCache: html,
              plainTextCache: plain,
            },
            { createAutoVersion: true }
          );
          setSaveState(isOnline ? 'saved' : 'offline');
          setLastSavedTime(
            new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          );
        }, delay);
      },
    },
    [documentId, doc?.isLocked]
  );

  // Sync title and per-document editor styles when switching notes
  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title);
    setFontFamilyVal(
      doc.editorStyle?.fontFamily || settings.editorPreferences.defaultFont || 'Plus Jakarta Sans'
    );
    setFontSizePx(doc.editorStyle?.fontSizePx || settings.editorPreferences.defaultFontSize || 16);
    setLineHeightVal(
      doc.editorStyle?.lineHeight || settings.editorPreferences.defaultLineSpacing || 1.6
    );
    setParagraphSpacingPx(doc.editorStyle?.paragraphSpacingPx ?? 10);
  }, [doc?.id]);

  // Listen for footnote node clicks to inspect/edit/delete instead of silent deletion
  useEffect(() => {
    const handler = (ev: Event) => {
      const custom = ev as CustomEvent<{ pos: number; number: number; text: string }>;
      if (!custom.detail) return;
      setEditingFootnote(custom.detail);
      setFootnoteText(custom.detail.text || '');
      setFootnotePromptOpen(true);
    };
    window.addEventListener('notely-edit-footnote', handler);
    return () => window.removeEventListener('notely-edit-footnote', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      speechRef.current?.stop();
    };
  }, []);

  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-12">
        <EmptyState
          icon={<ArrowLeft className="w-6 h-6" />}
          title="Document not found"
          description="This document may have been moved to Trash or deleted."
          action={<AppButton onClick={goBack}>Back to Home</AppButton>}
        />
      </div>
    );
  }

  // Locked Private Note Screen
  if (doc.isLocked) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0E0D14] flex flex-col">
        <header className="h-14 px-4 flex items-center gap-3 border-b border-[#ECEAF1] dark:border-[#2A2838]">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold truncate">{doc.title}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await unlockPrivateDocument(doc.id, lockPassphrase);
              if (ok) setLockPassphrase('');
            }}
            className="notely-card rounded-3xl p-6 max-w-sm w-full text-center space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--notely-accent-light)] text-[var(--notely-accent)] flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Private Encrypted Note</h2>
              <p className="text-xs text-[#92909D] mt-1">
                Enter the passphrase or PIN used to lock this note.
              </p>
            </div>
            <input
              type="password"
              required
              value={lockPassphrase}
              onChange={(e) => setLockPassphrase(e.target.value)}
              placeholder="Passphrase or PIN"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm text-center"
            />
            <AppButton type="submit" className="w-full">
              Unlock Note
            </AppButton>
          </form>
        </div>
      </div>
    );
  }

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    setSaveState('saving');
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      await saveDocument(doc.id, { title: nextTitle.trim() || 'Untitled Note' });
      setSaveState(isOnline ? 'saved' : 'offline');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }, 300);
  };

  const handleBackNavigation = async () => {
    if (editor) {
      const json = editor.getJSON() as StructuredContent;
      await saveDocument(doc.id, {
        title: title.trim() || 'Untitled Note',
        content: json,
        htmlCache: editor.getHTML(),
        plainTextCache: extractPlainText(json),
      });
    }
    goBack();
  };

  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
      await recordMediaAsset({
        documentId: doc.id,
        mediaType: 'image',
        localPath: dataUrl,
        fileName: file.name,
        mimeType: file.type || 'image/png',
        sizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleVoiceTyping = () => {
    if (isListening) {
      speechRef.current?.stop();
      setIsListening(false);
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Rec) {
      showToast('Device speech recognition unavailable in this browser; opening Audio Memo instead.', 'info');
      setAudioModalOpen(true);
      return;
    }
    const recognition = new Rec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const transcript = last?.[0]?.transcript;
      if (transcript && editor) {
        editor.chain().focus().insertContent(`${transcript} `).run();
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      showToast('Voice dictation stopped or microphone permission denied', 'error');
    };
    recognition.onend = () => setIsListening(false);
    speechRef.current = recognition;
    recognition.start();
    setIsListening(true);
    showToast('Listening... speak to dictate text', 'info');
  };

  const handleInsertAction = (action: InsertActionType) => {
    if (!editor) return;
    switch (action) {
      case 'image-gallery':
        imageInputRef.current?.click();
        break;
      case 'image-camera':
        cameraInputRef.current?.click();
        break;
      case 'table':
        setTableModalOpen(true);
        break;
      case 'drawing':
        setDrawingTitle('Drawing');
        setDrawingOpen(true);
        break;
      case 'signature':
        setDrawingTitle('Signature');
        setDrawingOpen(true);
        break;
      case 'chart':
        setChartModalOpen(true);
        break;
      case 'link':
        setLinkModalOpen(true);
        break;
      case 'comment':
        setCommentsOpen(true);
        break;
      case 'divider':
        ensureNotReplacingBlockNode();
        editor.chain().focus().setHorizontalRule().run();
        break;
      case 'footnote':
        setEditingFootnote(null);
        setFootnoteText('');
        setFootnotePromptOpen(true);
        break;
      case 'symbols':
        setSymbolsModalOpen(true);
        break;
      case 'equation':
        setEquationModalOpen(true);
        break;
      case 'contents':
        insertBlockOutsideTable({ type: 'toc' });
        break;
      case 'bookmark':
        setBookmarkPromptOpen(true);
        break;
      case 'page-break':
        insertBlockOutsideTable({ type: 'pageBreak' });
        break;
      case 'section-break':
        insertBlockOutsideTable({ type: 'sectionBreak' });
        break;
      case 'date':
        ensureNotReplacingBlockNode();
        editor
          .chain()
          .focus()
          .insertContent(new Date().toLocaleDateString([], { dateStyle: 'medium' }) + ' ')
          .run();
        break;
      case 'time':
        ensureNotReplacingBlockNode();
        editor
          .chain()
          .focus()
          .insertContent(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ')
          .run();
        break;
      case 'shape':
        setCalloutLabel('Shape Callout');
        setCalloutPromptOpen(true);
        break;
      case 'textbox':
        setCalloutLabel('Text Box');
        setCalloutPromptOpen(true);
        break;
      case 'header-footer':
      case 'page-number':
      case 'watermark':
        setPageSetupOpen(true);
        break;
      case 'scanner':
        setScannerModalOpen(true);
        break;
      case 'audio':
        setAudioModalOpen(true);
        break;
    }
  };

  const handleOptionAction = async (action: NoteOptionAction) => {
    switch (action) {
      case 'page-setup':
        setPageSetupOpen(true);
        break;
      case 'find-replace':
        setFindReplaceOpen(true);
        break;
      case 'word-count':
        setWordCountOpen(true);
        break;
      case 'spelling':
        setSpellingOpen(true);
        break;
      case 'version-history':
        setVersionHistoryOpen(true);
        break;
      case 'comments':
        setCommentsOpen(true);
        break;
      case 'bookmarks':
        setBookmarksOpen(true);
        break;
      case 'tags':
        setTagsOpen(true);
        break;
      case 'favorite':
        await saveDocument(doc.id, { isFavorite: !doc.isFavorite });
        showToast(doc.isFavorite ? 'Removed from Starred' : 'Added to Starred', 'info');
        break;
      case 'move':
        setMoveOpen(true);
        break;
      case 'share-export':
        setShareOpen(true);
        break;
      case 'copy': {
        const copy = await duplicateDocument(doc.id);
        if (copy) navigate({ name: 'editor', documentId: copy.id });
        break;
      }
      case 'rename':
        setRenameOpen(true);
        break;
      case 'lock':
        setLockPromptOpen(true);
        break;
      case 'archive':
        await saveDocument(doc.id, { isArchived: !doc.isArchived });
        showToast(doc.isArchived ? 'Note unarchived' : 'Note archived', 'info');
        if (!doc.isArchived) goBack();
        break;
      case 'delete':
        setDeleteConfirmOpen(true);
        break;
    }
  };

  const currentHeadingLabel = () => {
    if (!editor) return 'Normal text';
    for (let lvl = 1; lvl <= 6; lvl++) {
      if (editor.isActive('heading', { level: lvl })) return `Heading ${lvl}`;
    }
    return 'Normal text';
  };

  const applyCaseTransform = (mode: 'upper' | 'lower' | 'title' | 'sentence') => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      showToast('Select some text first to change capitalization', 'info');
      return;
    }
    const selected = editor.state.doc.textBetween(from, to, ' ');
    editor.chain().focus().insertContentAt({ from, to }, transformTextCase(selected, mode)).run();
  };

  const ensureNotReplacingBlockNode = () => {
    if (!editor) return;
    const sel = editor.state.selection as { node?: { isBlock?: boolean }; to: number };
    if (sel.node) {
      if (sel.node.isBlock) {
        editor.chain().focus().insertContentAt(sel.to, { type: 'paragraph' }).run();
      } else {
        editor.commands.setTextSelection(sel.to);
      }
    }
  };

  const insertBlockOutsideTable = (content: Record<string, unknown>) => {
    if (!editor) return;
    const payload = [content, { type: 'paragraph' }];
    if (editor.isActive('table')) {
      const { $from } = editor.state.selection;
      for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name === 'table') {
          const afterPos = $from.after(depth);
          editor.chain().focus().insertContentAt(afterPos, payload).run();
          return;
        }
      }
    }
    const sel = editor.state.selection as { node?: unknown; to: number };
    if (sel.node) {
      editor.chain().focus().insertContentAt(sel.to, payload).run();
      return;
    }
    editor.chain().focus().insertContent(payload).run();
  };

  const persistEditorStyle = (
    patch: Partial<{
      fontFamily: string;
      fontSizePx: number;
      lineHeight: number;
      paragraphSpacingPx: number;
    }>
  ) => {
    const next = {
      fontFamily: patch.fontFamily ?? fontFamilyVal,
      fontSizePx: patch.fontSizePx ?? fontSizePx,
      lineHeight: patch.lineHeight ?? lineHeightVal,
      paragraphSpacingPx: patch.paragraphSpacingPx ?? paragraphSpacingPx,
    };
    void saveDocument(doc.id, { editorStyle: next });
  };

  const renumberFootnotes = () => {
    if (!editor) return;
    let count = 0;
    const { tr } = editor.state;
    let changed = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'footnote') {
        count += 1;
        if (Number(node.attrs.number) !== count) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, number: count });
          changed = true;
        }
      }
    });
    if (changed) {
      editor.view.dispatch(tr);
    }
  };

  const handleClipboardAction = async (mode: 'cut' | 'copy' | 'paste') => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectionText = from !== to ? editor.state.doc.textBetween(from, to, '\n') : '';
    try {
      if (mode === 'copy' || mode === 'cut') {
        if (!selectionText) {
          showToast('Select text first', 'info');
          return;
        }
        await navigator.clipboard.writeText(selectionText);
        if (mode === 'cut') {
          editor.chain().focus().deleteSelection().run();
          showToast('Cut to clipboard', 'info');
        } else {
          showToast('Copied to clipboard', 'info');
        }
      } else {
        const pasted = await navigator.clipboard.readText();
        if (pasted) {
          editor.chain().focus().insertContent(pasted).run();
        }
      }
    } catch {
      showToast('Clipboard access blocked by browser permissions', 'error');
    }
  };

  const selectedText = editor
    ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ')
    : '';

  const paperDims = getPaperDimensionsMm(doc.pageSetup);
  const paperMaxWidthPx =
    doc.pageSetup.orientation === 'landscape'
      ? 920
      : doc.pageSetup.paperSize === 'A5'
        ? 560
        : doc.pageSetup.paperSize === 'A3'
          ? 900
          : 740;

  const isInTable = editor?.isActive('table') ?? false;

  const saveLabel =
    saveState === 'saving'
      ? 'Saving...'
      : !isOnline
        ? 'Offline · Saved locally'
        : `Saved · ${lastSavedTime || 'Just now'}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F9] dark:bg-[#0E0D14]">
      {/* Top Toolbar matching Reference 3 */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#16151E]/95 backdrop-blur-md border-b border-[#ECEAF1] dark:border-[#2A2838] no-print">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleBackNavigation}
              aria-label="Back"
              className="w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] flex items-center justify-center text-[#24232B] dark:text-[#F4F3F8] shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                aria-label="Document title"
                placeholder="Untitled Note"
                className="w-full bg-transparent text-[15px] font-bold text-[#24232B] dark:text-[#F4F3F8] outline-none truncate"
              />
              <div
                data-testid="save-status"
                className={`text-[11px] font-medium tabular-nums ${
                  saveState === 'saving' ? 'text-[#EAB308]' : 'text-[#92909D]'
                }`}
              >
                {saveLabel}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              aria-label="Comments"
              className="relative w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] flex items-center justify-center text-[#5C5A68] dark:text-[#B2B0BE] cursor-pointer"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              {docCommentsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--notely-accent)] text-white text-[10px] font-bold flex items-center justify-center">
                  {docCommentsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={async () => {
                await saveDocument(doc.id, { isPinned: !doc.isPinned });
                showToast(doc.isPinned ? 'Unpinned note' : 'Pinned note', 'info');
              }}
              aria-label={doc.isPinned ? 'Unpin note' : 'Pin note'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer ${
                doc.isPinned
                  ? 'bg-[var(--notely-accent-light)] dark:bg-[#2E224C] text-[var(--notely-accent)]'
                  : 'bg-[#F4F3F8] dark:bg-[#242232] text-[#5C5A68] dark:text-[#B2B0BE]'
              }`}
            >
              <Pin className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setOptionsOpen(true)}
              aria-label="Note options"
              className="w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] flex items-center justify-center text-[#5C5A68] dark:text-[#B2B0BE] cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formatting Toolbar matching Reference 3 */}
        {editor && (
          <div className="border-t border-[#ECEAF1] dark:border-[#2A2838] bg-white dark:bg-[#16151E]">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {/* Text Style Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setStyleMenuOpen((s) => !s)}
                  className="h-9 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold text-[#24232B] dark:text-[#F4F3F8] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {currentHeadingLabel()}
                  <ChevronDown className="w-3.5 h-3.5 text-[#92909D]" />
                </button>
              </div>

              <div className="h-5 w-px bg-[#ECEAF1] dark:bg-[#2A2838] mx-0.5 shrink-0" />

              <button
                type="button"
                aria-label="Bold"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  editor.isActive('bold')
                    ? 'bg-[var(--notely-accent-light)] text-[var(--notely-accent)]'
                    : 'text-[#24232B] dark:text-[#F4F3F8] hover:bg-[#F4F3F8] dark:hover:bg-[#242232]'
                }`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Italic"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  editor.isActive('italic')
                    ? 'bg-[var(--notely-accent-light)] text-[var(--notely-accent)]'
                    : 'text-[#24232B] dark:text-[#F4F3F8] hover:bg-[#F4F3F8] dark:hover:bg-[#242232]'
                }`}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Underline"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  editor.isActive('underline')
                    ? 'bg-[var(--notely-accent-light)] text-[var(--notely-accent)]'
                    : 'text-[#24232B] dark:text-[#F4F3F8] hover:bg-[#F4F3F8] dark:hover:bg-[#242232]'
                }`}
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Strikethrough"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  editor.isActive('strike')
                    ? 'bg-[var(--notely-accent-light)] text-[var(--notely-accent)]'
                    : 'text-[#24232B] dark:text-[#F4F3F8] hover:bg-[#F4F3F8] dark:hover:bg-[#242232]'
                }`}
              >
                <Strikethrough className="w-4 h-4" />
              </button>

              <button
                type="button"
                aria-label="Text color"
                onClick={() => {
                  setTextColorMenuOpen((v) => !v);
                  setHighlightMenuOpen(false);
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold underline decoration-2 shrink-0 hover:bg-[#F4F3F8] dark:hover:bg-[#242232] cursor-pointer"
              >
                A
              </button>
              <button
                type="button"
                aria-label="Highlight text"
                onClick={() => {
                  setHighlightMenuOpen((v) => !v);
                  setTextColorMenuOpen(false);
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  editor.isActive('highlight')
                    ? 'bg-[#FFF6D9] text-[#CA8A04]'
                    : 'text-[#24232B] dark:text-[#F4F3F8] hover:bg-[#F4F3F8] dark:hover:bg-[#242232]'
                }`}
              >
                <Highlighter className="w-4 h-4" />
              </button>

              <div className="h-5 w-px bg-[#ECEAF1] dark:bg-[#2A2838] mx-0.5 shrink-0" />

              <button
                type="button"
                aria-label="Bulleted list"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  editor.isActive('bulletList')
                    ? 'bg-[var(--notely-accent-light)] text-[var(--notely-accent)]'
                    : 'text-[#5C5A68] dark:text-[#B2B0BE] hover:bg-[#F4F3F8]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Numbered list"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  editor.isActive('orderedList')
                    ? 'bg-[var(--notely-accent-light)] text-[var(--notely-accent)]'
                    : 'text-[#5C5A68] dark:text-[#B2B0BE] hover:bg-[#F4F3F8]'
                }`}
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Checklist"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  editor.isActive('taskList')
                    ? 'bg-[var(--notely-accent-light)] text-[var(--notely-accent)]'
                    : 'text-[#5C5A68] dark:text-[#B2B0BE] hover:bg-[#F4F3F8]'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
              </button>

              <div className="h-5 w-px bg-[#ECEAF1] dark:bg-[#2A2838] mx-0.5 shrink-0" />

              <button
                type="button"
                aria-label="Undo"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5C5A68] dark:text-[#B2B0BE] disabled:opacity-35 hover:bg-[#F4F3F8] shrink-0 cursor-pointer"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Redo"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5C5A68] dark:text-[#B2B0BE] disabled:opacity-35 hover:bg-[#F4F3F8] shrink-0 cursor-pointer"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Inline Popovers for Heading Styles, Text Color, Highlight, and Contextual Table Tools */}
            {styleMenuOpen && (
              <div className="max-w-5xl mx-auto px-4 pb-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setParagraph().run();
                    setStyleMenuOpen(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-xs font-medium cursor-pointer"
                >
                  Normal text
                </button>
                {([1, 2, 3, 4, 5, 6] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: lvl }).run();
                      setStyleMenuOpen(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      editor.isActive('heading', { level: lvl })
                        ? 'bg-[var(--notely-accent)] text-white'
                        : 'bg-[#F4F3F8] dark:bg-[#242232]'
                    }`}
                  >
                    H{lvl}
                  </button>
                ))}
              </div>
            )}

            {textColorMenuOpen && (
              <div className="max-w-5xl mx-auto px-4 pb-2 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#92909D]">Text color:</span>
                {['#24232B', '#8950F5', '#3B82F6', '#22C55E', '#EAB308', '#EF4444', '#EC4899'].map(
                  (hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Text color ${hex}`}
                      onClick={() => {
                        editor.chain().focus().setColor(hex).run();
                        setTextColorMenuOpen(false);
                      }}
                      className="w-6 h-6 rounded-full border border-white shadow cursor-pointer"
                      style={{ backgroundColor: hex }}
                    />
                  )
                )}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setTextColorMenuOpen(false);
                  }}
                  className="text-xs text-[#92909D] ml-1 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}

            {highlightMenuOpen && (
              <div className="max-w-5xl mx-auto px-4 pb-2 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#92909D]">Highlight:</span>
                {['#FEF08A', '#BBF7D0', '#BFDBFE', '#F5D0FE', '#FECACA'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Highlight ${hex}`}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: hex }).run();
                      setHighlightMenuOpen(false);
                    }}
                    className="w-6 h-6 rounded-full border border-[#DFDCE8] cursor-pointer"
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    setHighlightMenuOpen(false);
                  }}
                  className="text-xs text-[#92909D] ml-1 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            {isInTable && (
              <div className="max-w-5xl mx-auto px-4 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-bold text-[var(--notely-accent)] mr-1">
                  Table:
                </span>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  className="px-2.5 py-1 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-[11px] font-semibold cursor-pointer"
                >
                  + Row
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  className="px-2.5 py-1 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-[11px] font-semibold cursor-pointer"
                >
                  − Row
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  className="px-2.5 py-1 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-[11px] font-semibold cursor-pointer"
                >
                  + Col
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  className="px-2.5 py-1 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-[11px] font-semibold cursor-pointer"
                >
                  − Col
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().mergeCells().run()}
                  className="px-2.5 py-1 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-[11px] font-semibold cursor-pointer"
                >
                  Merge
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().splitCell().run()}
                  className="px-2.5 py-1 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-[11px] font-semibold cursor-pointer"
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="px-2.5 py-1 rounded-lg bg-[#FEECEC] text-[#EF4444] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Document Paper Canvas respecting Page Setup */}
      <main className="flex-1 px-3 sm:px-6 py-4 pb-24 flex justify-center overflow-y-auto">
        <div
          className="w-full rounded-3xl shadow-sm relative transition-colors"
          style={{
            maxWidth: `${paperMaxWidthPx}px`,
            backgroundColor: doc.pageSetup.pageColor || '#FFFFFF',
            color:
              doc.pageSetup.pageColor?.toUpperCase() === '#FFFFFF' ? undefined : '#24232B',
            border: doc.pageSetup.showPageBorder
              ? `1.5px solid ${doc.pageSetup.borderColor || '#DFDCE8'}`
              : '1px solid #ECEAF1',
            paddingTop: `${Math.max(18, Math.round(doc.pageSetup.marginsMm.top * 1.1))}px`,
            paddingRight: `${Math.max(18, Math.round(doc.pageSetup.marginsMm.right * 1.1))}px`,
            paddingBottom: `${Math.max(24, Math.round(doc.pageSetup.marginsMm.bottom * 1.2))}px`,
            paddingLeft: `${Math.max(18, Math.round(doc.pageSetup.marginsMm.left * 1.1))}px`,
            fontSize: `${fontSizePx}px`,
            lineHeight: lineHeightVal,
            fontFamily: fontFamilyVal,
            '--notely-p-spacing': `${paragraphSpacingPx}px`,
          } as React.CSSProperties}
        >
          {/* Optional Header */}
          {doc.pageSetup.headerText && !doc.pageSetup.differentFirstPage && (
            <div
              className="text-xs text-[#92909D] pb-3 mb-3 border-b border-[#ECEAF1]/60"
              style={{ textAlign: doc.pageSetup.headerPosition }}
            >
              {doc.pageSetup.headerText}
            </div>
          )}

          {/* Optional Watermark */}
          {doc.pageSetup.watermarkText && (
            <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <span className="text-5xl font-bold tracking-widest text-black/5 -rotate-25">
                {doc.pageSetup.watermarkText}
              </span>
            </div>
          )}

          <div className="dark:text-[#24232B] relative z-10">
            <EditorContent editor={editor} />
          </div>

          {/* Optional Footer / Page Number / Paper Size Metadata */}
          {(doc.pageSetup.footerText || doc.pageSetup.showPageNumbers) && (
            <div
              className="text-xs text-[#92909D] pt-4 mt-6 border-t border-[#ECEAF1]/60"
              style={{ textAlign: doc.pageSetup.footerPosition }}
            >
              {[doc.pageSetup.footerText, doc.pageSetup.showPageNumbers ? 'Page 1' : '']
                .filter(Boolean)
                .join(' · ')}
              <span className="ml-2 text-[10px] opacity-70">
                ({doc.pageSetup.paperSize} {doc.pageSetup.orientation}, {paperDims.widthMm}×
                {paperDims.heightMm}mm)
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Editor Toolbar matching Reference 3 (+, Aa, Image, Mic, Search, Share) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#16151E]/95 backdrop-blur-md border-t border-[#ECEAF1] dark:border-[#2A2838] no-print">
        <div className="max-w-3xl mx-auto px-3 h-16 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setInsertOpen(true)}
            aria-label="Insert element"
            className="w-11 h-11 rounded-2xl bg-[var(--notely-accent)] hover:bg-[var(--notely-accent-deep)] text-white flex items-center justify-center shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setFormatSheetOpen(true)}
            aria-label="Text and paragraph formatting"
            className="flex-1 max-w-[68px] h-11 rounded-2xl bg-[var(--notely-accent-light)] dark:bg-[#2A2245] text-[var(--notely-accent)] font-bold text-sm flex items-center justify-center cursor-pointer"
          >
            Aa
          </button>

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Insert image"
            className="flex-1 max-w-[68px] h-11 rounded-2xl bg-[#F4F3F8] dark:bg-[#242232] text-[#24232B] dark:text-[#F4F3F8] flex items-center justify-center cursor-pointer"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleVoiceTyping}
            aria-label={isListening ? 'Stop voice typing' : 'Voice typing'}
            className={`flex-1 max-w-[68px] h-11 rounded-2xl flex items-center justify-center cursor-pointer ${
              isListening
                ? 'bg-[#FEECEC] text-[#EF4444]'
                : 'bg-[#F4F3F8] dark:bg-[#242232] text-[#24232B] dark:text-[#F4F3F8]'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => setFindReplaceOpen(true)}
            aria-label="Find and replace"
            className="flex-1 max-w-[68px] h-11 rounded-2xl bg-[#F4F3F8] dark:bg-[#242232] text-[#24232B] dark:text-[#F4F3F8] flex items-center justify-center cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Share and export"
            className="flex-1 max-w-[68px] h-11 rounded-2xl bg-[#F4F3F8] dark:bg-[#242232] text-[#24232B] dark:text-[#F4F3F8] flex items-center justify-center cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Hidden inputs for Gallery, Camera & File Import */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={handleImageFileSelected}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFileSelected}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.md,.markdown,.html,.htm,.rtf,.docx,.odt,.pdf"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f || !editor) return;
          try {
            const imported = await importDocumentFile(f);
            editor.commands.setContent(imported.html);
            showToast(`Imported ${imported.sourceFormat} into current note`, 'success');
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Import failed', 'error');
          } finally {
            e.target.value = '';
          }
        }}
      />

      {/* Aa Full Formatting & Paragraph Sheet */}
      {editor && (
        <BottomSheet
          open={formatSheetOpen}
          onClose={() => setFormatSheetOpen(false)}
          title="Text & paragraph"
        >
          <div className="space-y-4 pb-2">
            <div>
              <div className="text-xs font-semibold text-[#92909D] mb-2">Alignment</div>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { id: 'left', icon: <AlignLeft className="w-4 h-4" /> },
                    { id: 'center', icon: <AlignCenter className="w-4 h-4" /> },
                    { id: 'right', icon: <AlignRight className="w-4 h-4" /> },
                    { id: 'justify', icon: <AlignJustify className="w-4 h-4" /> },
                  ] as const
                ).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-label={`Align ${a.id}`}
                    onClick={() => editor.chain().focus().setTextAlign(a.id).run()}
                    className={`h-10 rounded-xl flex items-center justify-center cursor-pointer ${
                      editor.isActive({ textAlign: a.id })
                        ? 'bg-[var(--notely-accent)] text-white'
                        : 'bg-[#F4F3F8] dark:bg-[#242232]'
                    }`}
                  >
                    {a.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-[#92909D] mb-1.5">Font family</div>
                <select
                  value={fontFamilyVal}
                  onChange={(e) => {
                    const nextFont = e.target.value;
                    setFontFamilyVal(nextFont);
                    editor.chain().focus().setFontFamily(nextFont).run();
                    persistEditorStyle({ fontFamily: nextFont });
                  }}
                  aria-label="Font family"
                  className="w-full h-10 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-medium"
                >
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Lora">Lora (Serif)</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#92909D] mb-1.5">
                  Font size ({fontSizePx}px)
                </div>
                <input
                  type="range"
                  min={12}
                  max={28}
                  value={fontSizePx}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setFontSizePx(nextSize);
                    persistEditorStyle({ fontSizePx: nextSize });
                  }}
                  className="w-full accent-[var(--notely-accent)] mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-[#92909D] mb-1.5">
                  Line spacing ({lineHeightVal.toFixed(1)})
                </div>
                <input
                  type="range"
                  min={1.1}
                  max={2.4}
                  step={0.1}
                  value={lineHeightVal}
                  onChange={(e) => {
                    const nextLh = Number(e.target.value);
                    setLineHeightVal(nextLh);
                    persistEditorStyle({ lineHeight: nextLh });
                  }}
                  className="w-full accent-[var(--notely-accent)]"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#92909D] mb-1.5">
                  Paragraph spacing ({paragraphSpacingPx}px)
                </div>
                <input
                  type="range"
                  min={0}
                  max={28}
                  step={2}
                  value={paragraphSpacingPx}
                  onChange={(e) => {
                    const nextPs = Number(e.target.value);
                    setParagraphSpacingPx(nextPs);
                    persistEditorStyle({ paragraphSpacingPx: nextPs });
                  }}
                  className="w-full accent-[var(--notely-accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                aria-label="Superscript"
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                className={`h-10 rounded-xl flex items-center justify-center cursor-pointer ${
                  editor.isActive('superscript')
                    ? 'bg-[var(--notely-accent)] text-white'
                    : 'bg-[#F4F3F8] dark:bg-[#242232]'
                }`}
              >
                <SuperscriptIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Subscript"
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                className={`h-10 rounded-xl flex items-center justify-center cursor-pointer ${
                  editor.isActive('subscript')
                    ? 'bg-[var(--notely-accent)] text-white'
                    : 'bg-[#F4F3F8] dark:bg-[#242232]'
                }`}
              >
                <SubscriptIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Increase indent"
                onClick={() => {
                  const typeName = editor.isActive('taskItem') ? 'taskItem' : 'listItem';
                  editor.chain().focus().sinkListItem(typeName).run();
                }}
                className="h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] flex items-center justify-center cursor-pointer"
              >
                <Indent className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Decrease indent"
                onClick={() => {
                  const typeName = editor.isActive('taskItem') ? 'taskItem' : 'listItem';
                  editor.chain().focus().liftListItem(typeName).run();
                }}
                className="h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] flex items-center justify-center cursor-pointer"
              >
                <Outdent className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Clear formatting"
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                className="h-10 rounded-xl bg-[#FEECEC] text-[#EF4444] flex items-center justify-center cursor-pointer"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleClipboardAction('cut')}
                className="h-9 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" /> Cut
              </button>
              <button
                type="button"
                onClick={() => handleClipboardAction('copy')}
                className="h-9 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                type="button"
                onClick={() => handleClipboardAction('paste')}
                className="h-9 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" /> Paste
              </button>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#92909D] mb-2">
                Capitalization (selected text)
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyCaseTransform('upper')}
                  className="h-9 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold cursor-pointer"
                >
                  UPPER
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseTransform('lower')}
                  className="h-9 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold cursor-pointer"
                >
                  lower
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseTransform('title')}
                  className="h-9 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold cursor-pointer"
                >
                  Title Case
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseTransform('sentence')}
                  className="h-9 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold cursor-pointer"
                >
                  Sentence
                </button>
              </div>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Primary Sheets & Modals */}
      <InsertMenuSheet
        open={insertOpen}
        onClose={() => setInsertOpen(false)}
        onSelect={handleInsertAction}
      />

      <NoteOptionsSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        doc={doc}
        onColorChange={(cardColor) => saveDocument(doc.id, { cardColor })}
        onAction={handleOptionAction}
      />

      <ShareExportSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        doc={doc}
        onMakeCopy={async () => {
          const copy = await duplicateDocument(doc.id);
          if (copy) navigate({ name: 'editor', documentId: copy.id });
        }}
        onOpenImport={() => importInputRef.current?.click()}
      />

      {drawingOpen && (
        <DrawingWorkspace
          title={drawingTitle}
          onClose={() => setDrawingOpen(false)}
          onInsert={async (dataUrl) => {
            insertBlockOutsideTable({ type: 'drawing', attrs: { src: dataUrl, caption: drawingTitle } });
            await recordMediaAsset({
              documentId: doc.id,
              mediaType: 'drawing',
              localPath: dataUrl,
              fileName: `${drawingTitle.toLowerCase()}.png`,
              mimeType: 'image/png',
              sizeBytes: dataUrl.length,
            });
            setDrawingOpen(false);
          }}
        />
      )}

      <TableInsertModal
        open={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        onInsert={(rows, cols, withHeaderRow) =>
          editor?.chain().focus().insertTable({ rows, cols, withHeaderRow }).run()
        }
      />

      <ChartBuilderModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        onInsert={(config: ChartConfig) =>
          insertBlockOutsideTable({ type: 'chart', attrs: { title: config.title, config } })
        }
      />

      <LinkInsertModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        initialText={selectedText}
        onInsert={(linkText, href) => {
          if (!editor) return;
          if (selectedText) {
            editor.chain().focus().setLink({ href }).run();
          } else {
            ensureNotReplacingBlockNode();
            editor
              .chain()
              .focus()
              .insertContent([
                { type: 'text', text: linkText, marks: [{ type: 'link', attrs: { href } }] },
                { type: 'text', text: ' ' },
              ])
              .run();
          }
        }}
      />

      <EquationModal
        open={equationModalOpen}
        onClose={() => setEquationModalOpen(false)}
        onInsert={(latex) =>
          insertBlockOutsideTable({ type: 'equation', attrs: { latex } })
        }
      />

      <SymbolsModal
        open={symbolsModalOpen}
        onClose={() => setSymbolsModalOpen(false)}
        onInsert={(sym) => {
          ensureNotReplacingBlockNode();
          editor?.chain().focus().insertContent(sym).run();
        }}
      />

      <ScannerModal
        open={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onInsertScan={async (dataUrl, text) => {
          if (!editor) return;
          editor.chain().focus().setImage({ src: dataUrl, alt: 'Scanned Document' }).run();
          if (text) {
            editor
              .chain()
              .focus()
              .insertContent({ type: 'paragraph', content: [{ type: 'text', text }] })
              .run();
          }
          await recordMediaAsset({
            documentId: doc.id,
            mediaType: 'scan',
            localPath: dataUrl,
            fileName: 'scan.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: dataUrl.length,
          });
        }}
      />

      <AudioRecorderModal
        open={audioModalOpen}
        onClose={() => setAudioModalOpen(false)}
        onInsertAudio={async (src, audioTitle) => {
          insertBlockOutsideTable({ type: 'audioBlock', attrs: { src, title: audioTitle } });
          await recordMediaAsset({
            documentId: doc.id,
            mediaType: 'audio',
            localPath: src,
            fileName: audioTitle,
            mimeType: 'audio/webm',
            sizeBytes: src.length,
          });
        }}
      />

      <PageSetupModal
        open={pageSetupOpen}
        onClose={() => setPageSetupOpen(false)}
        pageSetup={doc.pageSetup}
        onSave={(pageSetup) => saveDocument(doc.id, { pageSetup })}
      />

      <FindReplaceModal
        open={findReplaceOpen}
        onClose={() => setFindReplaceOpen(false)}
        plainText={doc.plainTextCache}
        html={editor?.getHTML() ?? doc.htmlCache}
        onApplyHtml={(nextHtml, count) => {
          editor?.commands.setContent(nextHtml);
          showToast(`Replaced ${count} occurrence${count === 1 ? '' : 's'}`, 'success');
        }}
      />

      <WordCountModal
        open={wordCountOpen}
        onClose={() => setWordCountOpen(false)}
        plainText={doc.plainTextCache}
        content={doc.content}
        pageSetup={doc.pageSetup}
      />

      <SpellingGrammarModal
        open={spellingOpen}
        onClose={() => setSpellingOpen(false)}
        plainText={doc.plainTextCache}
        html={editor?.getHTML() ?? doc.htmlCache}
        onApplyHtml={(nextHtml) => editor?.commands.setContent(nextHtml)}
      />

      <VersionHistoryModal
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        doc={doc}
        onRestored={(restored: DocumentRecord) => {
          setTitle(restored.title);
          editor?.commands.setContent(restored.content);
        }}
      />

      <CommentsModal
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        docId={doc.id}
        selectedText={selectedText}
      />

      {/* Footnote Insert / Edit Prompt */}
      <BottomSheet
        open={footnotePromptOpen}
        onClose={() => {
          setFootnotePromptOpen(false);
          setEditingFootnote(null);
          setFootnoteText('');
        }}
        title={editingFootnote ? `Footnote [${editingFootnote.number}]` : 'Insert footnote'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!footnoteText.trim() || !editor) return;
            if (editingFootnote && editingFootnote.pos >= 0) {
              const targetNode = editor.state.doc.nodeAt(editingFootnote.pos);
              if (targetNode && targetNode.type.name === 'footnote') {
                const { tr } = editor.state;
                tr.setNodeMarkup(editingFootnote.pos, undefined, {
                  ...targetNode.attrs,
                  text: footnoteText.trim(),
                });
                editor.view.dispatch(tr);
              }
            } else {
              ensureNotReplacingBlockNode();
              const nextNum = (editor.getHTML().match(/data-notely-footnote/g)?.length ?? 0) + 1;
              editor
                .chain()
                .focus()
                .insertContent({ type: 'footnote', attrs: { number: nextNum, text: footnoteText.trim() } })
                .run();
            }
            renumberFootnotes();
            setFootnoteText('');
            setEditingFootnote(null);
            setFootnotePromptOpen(false);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            required
            value={footnoteText}
            onChange={(e) => setFootnoteText(e.target.value)}
            placeholder="Citation or footnote text..."
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
          <div className="flex justify-between gap-2">
            {editingFootnote ? (
              <AppButton
                type="button"
                variant="danger"
                onClick={() => {
                  if (editor && editingFootnote.pos >= 0) {
                    const targetNode = editor.state.doc.nodeAt(editingFootnote.pos);
                    if (targetNode) {
                      editor.view.dispatch(
                        editor.state.tr.delete(
                          editingFootnote.pos,
                          editingFootnote.pos + targetNode.nodeSize
                        )
                      );
                      renumberFootnotes();
                    }
                  }
                  setFootnoteText('');
                  setEditingFootnote(null);
                  setFootnotePromptOpen(false);
                }}
              >
                Delete
              </AppButton>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setFootnotePromptOpen(false);
                  setEditingFootnote(null);
                  setFootnoteText('');
                }}
              >
                Cancel
              </AppButton>
              <AppButton type="submit">
                {editingFootnote ? 'Update Footnote' : 'Insert Footnote'}
              </AppButton>
            </div>
          </div>
        </form>
      </BottomSheet>

      {/* Bookmark Prompt */}
      <BottomSheet
        open={bookmarkPromptOpen}
        onClose={() => setBookmarkPromptOpen(false)}
        title="Insert bookmark"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!bookmarkName.trim() || !editor) return;
            ensureNotReplacingBlockNode();
            editor
              .chain()
              .focus()
              .insertContent({ type: 'bookmark', attrs: { name: bookmarkName.trim() } })
              .run();
            await addBookmark(doc.id, bookmarkName.trim(), `pos-${editor.state.selection.from}`);
            setBookmarkName('');
            setBookmarkPromptOpen(false);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            required
            value={bookmarkName}
            onChange={(e) => setBookmarkName(e.target.value)}
            placeholder="Bookmark name (e.g., Executive Summary)"
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setBookmarkPromptOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Save Bookmark</AppButton>
          </div>
        </form>
      </BottomSheet>

      {/* Bookmarks Manager Modal */}
      <BottomSheet
        open={bookmarksOpen}
        onClose={() => {
          setBookmarksOpen(false);
          setEditingBookmarkId(null);
        }}
        title="Bookmarks"
      >
        <div className="space-y-3 pb-2">
          {docBookmarks.length === 0 ? (
            <p className="text-xs text-[#92909D] text-center py-4">
              No bookmarks yet. Use Insert → Bookmark to mark important spots.
            </p>
          ) : (
            docBookmarks.map((bm) => (
              <div
                key={bm.id}
                className="notely-card rounded-2xl p-3 space-y-2"
              >
                {editingBookmarkId === bm.id ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (editingBookmarkName.trim()) {
                        await renameBookmark(bm.id, editingBookmarkName.trim());
                      }
                      setEditingBookmarkId(null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      required
                      value={editingBookmarkName}
                      onChange={(e) => setEditingBookmarkName(e.target.value)}
                      aria-label="Rename bookmark"
                      className="flex-1 h-9 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
                    />
                    <AppButton type="submit" size="sm">
                      Save
                    </AppButton>
                    <AppButton
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingBookmarkId(null)}
                    >
                      Cancel
                    </AppButton>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bookmark className="w-4 h-4 text-[#EC4899] shrink-0" />
                      <span className="text-sm font-semibold truncate">{bm.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const posNum = Number(bm.anchorReference.replace('pos-', '')) || 1;
                          editor?.chain().focus().setTextSelection(posNum).run();
                          setBookmarksOpen(false);
                        }}
                        className="text-xs font-semibold text-[var(--notely-accent)] cursor-pointer"
                      >
                        Jump
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBookmarkId(bm.id);
                          setEditingBookmarkName(bm.name);
                        }}
                        className="text-xs text-[#5C5A68] cursor-pointer"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBookmark(bm.id)}
                        className="text-xs text-[#EF4444] cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </BottomSheet>

      {/* Text Box / Callout Prompt */}
      <BottomSheet
        open={calloutPromptOpen}
        onClose={() => setCalloutPromptOpen(false)}
        title={`Insert ${calloutLabel}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!calloutText.trim() || !editor) return;
            insertBlockOutsideTable({
              type: 'callout',
              attrs: { label: calloutLabel, text: calloutText.trim(), color: doc.cardColor },
            });
            setCalloutText('');
            setCalloutPromptOpen(false);
          }}
          className="space-y-4"
        >
          <textarea
            required
            rows={3}
            value={calloutText}
            onChange={(e) => setCalloutText(e.target.value)}
            placeholder="Text inside box..."
            className="w-full p-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setCalloutPromptOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Insert</AppButton>
          </div>
        </form>
      </BottomSheet>

      {/* Move to Notebook */}
      <BottomSheet open={moveOpen} onClose={() => setMoveOpen(false)} title="Move to notebook">
        <div className="space-y-2 pb-2">
          {notebooks
            .filter((n) => !n.archivedAt)
            .map((nb) => (
              <button
                key={nb.id}
                type="button"
                onClick={async () => {
                  await moveDocument(doc.id, nb.id);
                  setMoveOpen(false);
                }}
                className={`w-full p-3.5 rounded-2xl text-left text-sm font-semibold flex items-center justify-between cursor-pointer ${
                  doc.notebookId === nb.id
                    ? 'bg-[var(--notely-accent-light)] text-[var(--notely-accent)]'
                    : 'bg-[#F4F3F8] dark:bg-[#242232]'
                }`}
              >
                <span>{nb.name}</span>
                {doc.notebookId === nb.id && <span className="text-xs">Current</span>}
              </button>
            ))}
        </div>
      </BottomSheet>

      {/* Rename Modal */}
      <BottomSheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename note">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await saveDocument(doc.id, { title: title.trim() || 'Untitled Note' });
            setRenameOpen(false);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Save</AppButton>
          </div>
        </form>
      </BottomSheet>

      {/* Tags Modal */}
      <BottomSheet open={tagsOpen} onClose={() => setTagsOpen(false)} title="Note tags">
        <div className="flex flex-wrap gap-2 pb-2">
          {tags.map((t) => {
            const active = doc.tagIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleDocumentTag(doc.id, t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  active
                    ? 'bg-[var(--notely-accent)] text-white'
                    : 'bg-[#F4F3F8] dark:bg-[#242232]'
                }`}
              >
                #{t.name}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Lock Private Note Passphrase Modal */}
      <BottomSheet
        open={lockPromptOpen}
        onClose={() => setLockPromptOpen(false)}
        title="Encrypt & lock private note"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!lockPassphrase.trim()) return;
            await toggleDocumentLock(doc.id, lockPassphrase);
            setLockPassphrase('');
            setLockPromptOpen(false);
          }}
          className="space-y-4"
        >
          <p className="text-xs text-[#92909D]">
            Your note content will be encrypted on-device with AES-256-GCM before saving.
          </p>
          <input
            type="password"
            required
            value={lockPassphrase}
            onChange={(e) => setLockPassphrase(e.target.value)}
            placeholder="Enter passphrase or PIN"
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setLockPromptOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Lock Note</AppButton>
          </div>
        </form>
      </BottomSheet>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        title="Move note to Trash?"
        message={`Move "${doc.title}" to Trash? You can restore it later from the Trash view.`}
        confirmLabel="Move to Trash"
        danger
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          await trashDocument(doc.id);
          setDeleteConfirmOpen(false);
          goBack();
        }}
      />
    </div>
  );
}
