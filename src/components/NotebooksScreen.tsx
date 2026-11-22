import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  BarChart3,
  Edit3,
  FilePlus2,
  GitMerge,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useNotely } from '../context/NotelyContext';
import {
  AppButton,
  BottomSheet,
  ConfirmationDialog,
  EmptyState,
  NoteCard,
  NotebookCard,
  NotebookGlyph,
  SearchBar,
} from './DesignSystem';
import { filterAndSortDocuments } from '../utils/documentUtils';
import {
  CARD_COLORS,
  type CardColorKey,
  type NotebookFilterOption,
  type NotebookIconKey,
  type NotebookSortOption,
} from '../types/notely';

export function NotebooksScreen() {
  const { notebooks, documents, navigate, createNotebook, archiveNotebook, showToast } = useNotely();
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState<CardColorKey>('purple');
  const [icon, setIcon] = useState<NotebookIconKey>('book');

  const activeNotebooks = useMemo(() => notebooks.filter((n) => !n.archivedAt), [notebooks]);
  const archivedNotebooks = useMemo(() => notebooks.filter((n) => Boolean(n.archivedAt)), [notebooks]);

  const activeDocs = useMemo(
    () => documents.filter((d) => !d.deletedAt && !d.isArchived),
    [documents]
  );

  const countFor = (nbId: string) => activeDocs.filter((d) => d.notebookId === nbId).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const nb = await createNotebook({ name, description: desc, icon, color });
    setName('');
    setDesc('');
    setCreateOpen(false);
    showToast(`Created "${nb.name}"`, 'success');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-28 md:pb-12 space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#24232B] dark:text-[#F4F3F8]">
            Notebooks
          </h1>
          <p className="text-xs sm:text-sm text-[#92909D] mt-1 tabular-nums">
            {activeNotebooks.length} {activeNotebooks.length === 1 ? 'notebook' : 'notebooks'} ·{' '}
            {activeDocs.length} {activeDocs.length === 1 ? 'note' : 'notes'} total
          </p>
        </div>
        {archivedNotebooks.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="px-3 py-1.5 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] cursor-pointer"
          >
            {showArchived ? 'Active' : `Archived (${archivedNotebooks.length})`}
          </button>
        )}
      </header>

      <div className="space-y-3">
        {(showArchived ? archivedNotebooks : activeNotebooks).map((nb) => (
          <div key={nb.id} className="relative">
            <NotebookCard
              notebook={nb}
              noteCount={countFor(nb.id)}
              variant="row"
              onOpen={() => navigate({ name: 'notebook-detail', notebookId: nb.id })}
            />
            {showArchived && (
              <button
                type="button"
                onClick={() => archiveNotebook(nb.id, false)}
                className="mt-1.5 text-xs font-semibold text-[var(--notely-accent)] flex items-center gap-1 ml-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restore notebook
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Outlined purple "+ New notebook" button matching Reference 3 */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-2xl border border-[var(--notely-accent)]/50 bg-white dark:bg-[#1B1A26] text-[var(--notely-accent)] font-semibold text-sm shadow-sm hover:bg-[var(--notely-accent-light)] dark:hover:bg-[#282144] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New notebook
        </button>
      </div>

      <BottomSheet open={createOpen} onClose={() => setCreateOpen(false)} title="New notebook">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] mb-1.5">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Notebook name"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm text-[#24232B] dark:text-[#F4F3F8] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm text-[#24232B] dark:text-[#F4F3F8] outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] mb-1.5">
                Color
              </div>
              <div className="flex gap-2">
                {(Object.keys(CARD_COLORS) as CardColorKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={CARD_COLORS[key].label}
                    onClick={() => setColor(key)}
                    className={`w-7 h-7 rounded-full cursor-pointer ${
                      color === key ? 'ring-2 ring-offset-2 ring-[var(--notely-accent)]' : ''
                    }`}
                    style={{ backgroundColor: CARD_COLORS[key].hex }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] mb-1.5">
                Icon
              </div>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value as NotebookIconKey)}
                aria-label="Icon"
                className="h-9 px-2.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-medium text-[#24232B] dark:text-[#F4F3F8]"
              >
                <option value="book">Book</option>
                <option value="briefcase">Briefcase</option>
                <option value="lightbulb">Lightbulb</option>
                <option value="graduation">Graduation</option>
                <option value="folder">Folder</option>
                <option value="code">Code</option>
                <option value="compass">Compass</option>
                <option value="layers">Layers</option>
                <option value="heart">Heart</option>
                <option value="star">Star</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <AppButton type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Create</AppButton>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}

export function NotebookDetailScreen({ notebookId }: { notebookId: string }) {
  const {
    notebooks,
    documents,
    goBack,
    navigate,
    createDocument,
    updateNotebook,
    archiveNotebook,
    deleteNotebook,
    mergeDocuments,
    showToast,
  } = useNotely();

  const notebook = notebooks.find((n) => n.id === notebookId);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NotebookFilterOption>('all');
  const [sort, setSort] = useState<NotebookSortOption>('updated-desc');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [editName, setEditName] = useState(notebook?.name ?? '');
  const [editDesc, setEditDesc] = useState(notebook?.description ?? '');
  const [editColor, setEditColor] = useState<CardColorKey>(notebook?.color ?? 'purple');
  const [editIcon, setEditIcon] = useState<NotebookIconKey>(notebook?.icon ?? 'book');
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  useEffect(() => {
    if (editOpen && notebook) {
      setEditName(notebook.name);
      setEditDesc(notebook.description);
      setEditColor(notebook.color);
      setEditIcon(notebook.icon);
    }
  }, [editOpen, notebook]);

  const filteredDocs = useMemo(
    () =>
      filterAndSortDocuments(documents, {
        notebookId,
        filter,
        sort,
        query,
      }),
    [documents, notebookId, filter, sort, query]
  );

  const allNotebookDocs = useMemo(
    () => documents.filter((d) => d.notebookId === notebookId && !d.deletedAt),
    [documents, notebookId]
  );

  if (!notebook) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <EmptyState
          icon={<ArrowLeft className="w-6 h-6" />}
          title="Notebook not found"
          description="This notebook may have been deleted."
          action={<AppButton onClick={goBack}>Go Back</AppButton>}
        />
      </div>
    );
  }

  const color = CARD_COLORS[notebook.color] ?? CARD_COLORS.purple;
  const totalWords = allNotebookDocs.reduce(
    (sum, d) => sum + (d.plainTextCache ? d.plainTextCache.trim().split(/\s+/).length : 0),
    0
  );

  const handleCreateNoteHere = async () => {
    const doc = await createDocument({
      title: 'Untitled Note',
      notebookId: notebook.id,
      cardColor: notebook.color,
    });
    navigate({ name: 'editor', documentId: doc.id });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    await updateNotebook(notebook.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      color: editColor,
      icon: editIcon,
    });
    setEditOpen(false);
    showToast('Notebook updated', 'success');
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return;
    await mergeDocuments(mergeSource, mergeTarget);
    setMergeOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-28 md:pb-12 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to notebooks"
            className="w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] flex items-center justify-center text-[#24232B] dark:text-[#F4F3F8] cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: color.lightHex, color: color.hex }}
          >
            <NotebookGlyph icon={notebook.icon} className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#24232B] dark:text-[#F4F3F8] truncate">
              {notebook.name}
            </h1>
            <p className="text-xs text-[#92909D] truncate">
              {notebook.description || `${allNotebookDocs.length} notes`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AppButton size="sm" onClick={handleCreateNoteHere}>
            <FilePlus2 className="w-4 h-4" />
            New Note
          </AppButton>
          <button
            type="button"
            onClick={() => setOptionsOpen(true)}
            aria-label="Notebook options"
            className="w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] flex items-center justify-center text-[#24232B] dark:text-[#F4F3F8] cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder={`Search inside ${notebook.name}...`}
      />

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 'pinned', 'favorite', 'recent', 'archived'] as NotebookFilterOption[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap cursor-pointer ${
                filter === f
                  ? 'bg-[var(--notely-accent)] text-white'
                  : 'bg-[#F4F3F8] dark:bg-[#1B1A26] text-[#5C5A68] dark:text-[#B2B0BE]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as NotebookSortOption)}
          aria-label="Sort notes"
          className="h-9 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-semibold text-[#24232B] dark:text-[#F4F3F8] outline-none"
        >
          <option value="updated-desc">Recently Updated</option>
          <option value="created-desc">Recently Created</option>
          <option value="title-asc">Alphabetical A–Z</option>
          <option value="title-desc">Alphabetical Z–A</option>
          <option value="oldest-first">Oldest First</option>
          <option value="newest-first">Newest First</option>
        </select>
      </div>

      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={<FilePlus2 className="w-6 h-6" />}
          title="No notes in this view"
          description="Create a new note in this notebook or switch filters."
          action={<AppButton onClick={handleCreateNoteHere}>Create Note</AppButton>}
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDocs.map((doc) => (
            <NoteCard
              key={doc.id}
              doc={doc}
              notebook={notebook}
              onOpen={() => navigate({ name: 'editor', documentId: doc.id })}
            />
          ))}
        </div>
      )}

      {/* Notebook Options Sheet */}
      <BottomSheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Notebook options">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              setEditName(notebook.name);
              setEditDesc(notebook.description);
              setEditColor(notebook.color);
              setEditIcon(notebook.icon);
              setOptionsOpen(false);
              setEditOpen(true);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F4F3F8] dark:hover:bg-[#242232] text-sm font-semibold text-[#24232B] dark:text-[#F4F3F8] cursor-pointer"
          >
            <Edit3 className="w-4.5 h-4.5 text-[var(--notely-accent)]" />
            Rename &amp; Customize Appearance
          </button>
          <button
            type="button"
            onClick={() => {
              setOptionsOpen(false);
              setStatsOpen(true);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F4F3F8] dark:hover:bg-[#242232] text-sm font-semibold text-[#24232B] dark:text-[#F4F3F8] cursor-pointer"
          >
            <BarChart3 className="w-4.5 h-4.5 text-[#3B82F6]" />
            Notebook Statistics
          </button>
          {allNotebookDocs.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setMergeSource(allNotebookDocs[1].id);
                setMergeTarget(allNotebookDocs[0].id);
                setOptionsOpen(false);
                setMergeOpen(true);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F4F3F8] dark:hover:bg-[#242232] text-sm font-semibold text-[#24232B] dark:text-[#F4F3F8] cursor-pointer"
            >
              <GitMerge className="w-4.5 h-4.5 text-[#22C55E]" />
              Merge Notes
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await archiveNotebook(notebook.id, !notebook.archivedAt);
              setOptionsOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F4F3F8] dark:hover:bg-[#242232] text-sm font-semibold text-[#24232B] dark:text-[#F4F3F8] cursor-pointer"
          >
            <Archive className="w-4.5 h-4.5 text-[#EAB308]" />
            {notebook.archivedAt ? 'Restore Notebook' : 'Archive Notebook'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOptionsOpen(false);
              setDeleteConfirmOpen(true);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#FEECEC] dark:hover:bg-[#3A1E22] text-sm font-semibold text-[#EF4444] cursor-pointer"
          >
            <Trash2 className="w-4.5 h-4.5" />
            Delete Notebook
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit notebook">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <input
            type="text"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            aria-label="Notebook name"
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm text-[#24232B] dark:text-[#F4F3F8]"
          />
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            aria-label="Notebook description"
            placeholder="Description"
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm text-[#24232B] dark:text-[#F4F3F8]"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(Object.keys(CARD_COLORS) as CardColorKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={CARD_COLORS[key].label}
                  onClick={() => setEditColor(key)}
                  className={`w-7 h-7 rounded-full cursor-pointer ${
                    editColor === key ? 'ring-2 ring-offset-2 ring-[var(--notely-accent)]' : ''
                  }`}
                  style={{ backgroundColor: CARD_COLORS[key].hex }}
                />
              ))}
            </div>
            <select
              value={editIcon}
              onChange={(e) => setEditIcon(e.target.value as NotebookIconKey)}
              aria-label="Notebook icon"
              className="h-9 px-2.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-medium"
            >
              <option value="book">Book</option>
              <option value="briefcase">Briefcase</option>
              <option value="lightbulb">Lightbulb</option>
              <option value="graduation">Graduation</option>
              <option value="folder">Folder</option>
              <option value="code">Code</option>
              <option value="compass">Compass</option>
              <option value="layers">Layers</option>
              <option value="heart">Heart</option>
              <option value="star">Star</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Save Changes</AppButton>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet open={statsOpen} onClose={() => setStatsOpen(false)} title="Notebook statistics">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="notely-card rounded-2xl p-4">
            <div className="text-2xl font-bold tabular-nums text-[var(--notely-accent)]">
              {allNotebookDocs.length}
            </div>
            <div className="text-xs text-[#92909D] mt-1">Total Notes</div>
          </div>
          <div className="notely-card rounded-2xl p-4">
            <div className="text-2xl font-bold tabular-nums text-[#22C55E]">{totalWords}</div>
            <div className="text-xs text-[#92909D] mt-1">Total Words</div>
          </div>
          <div className="notely-card rounded-2xl p-4">
            <div className="text-2xl font-bold tabular-nums text-[#3B82F6]">
              {allNotebookDocs.filter((d) => d.isPinned).length}
            </div>
            <div className="text-xs text-[#92909D] mt-1">Pinned</div>
          </div>
          <div className="notely-card rounded-2xl p-4">
            <div className="text-2xl font-bold tabular-nums text-[#EAB308]">
              {allNotebookDocs.filter((d) => d.isFavorite).length}
            </div>
            <div className="text-xs text-[#92909D] mt-1">Starred</div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={mergeOpen} onClose={() => setMergeOpen(false)} title="Merge two notes">
        <form onSubmit={handleMerge} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">
              Append content from
            </label>
            <select
              value={mergeSource}
              onChange={(e) => setMergeSource(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            >
              {allNotebookDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">
              Into target note
            </label>
            <select
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            >
              {allNotebookDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setMergeOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Merge Notes</AppButton>
          </div>
        </form>
      </BottomSheet>

      <ConfirmationDialog
        open={deleteConfirmOpen}
        title="Delete notebook?"
        message={`Delete "${notebook.name}"? Existing notes inside will be moved safely to another active notebook.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          await deleteNotebook(notebook.id);
          setDeleteConfirmOpen(false);
          goBack();
        }}
      />
    </div>
  );
}
