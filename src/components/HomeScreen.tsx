import React, { useMemo, useRef, useState } from 'react';
import {
  Archive,
  BookOpen,
  CheckSquare,
  FilePlus2,
  FileText,
  FolderPlus,
  LayoutTemplate,
  Pencil,
  Pin,
  Plus,
  SquarePen,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useNotely } from '../context/NotelyContext';
import {
  BottomSheet,
  EmptyState,
  NoteCard,
  NotebookCard,
  SearchBar,
} from './DesignSystem';
import { filterAndSortDocuments, getGreetingForHour } from '../utils/documentUtils';
import { importDocumentFile } from '../utils/exportEngine';
import type { CardColorKey, NotebookIconKey } from '../types/notely';

export function HomeScreen() {
  const {
    user,
    notebooks,
    documents,
    navigate,
    createDocument,
    createNotebook,
    showToast,
  } = useNotely();

  const [searchQuery, setSearchQuery] = useState('');
  const [fabOpen, setFabOpen] = useState(false);
  const [newNbOpen, setNewNbOpen] = useState(false);
  const [nbName, setNbName] = useState('');
  const [nbDesc, setNbDesc] = useState('');
  const [nbColor, setNbColor] = useState<CardColorKey>('purple');
  const [nbIcon, setNbIcon] = useState<NotebookIconKey>('book');
  const importInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const greeting = `${getGreetingForHour(now.getHours())}, ${user.name || 'Writer'}`;

  const activeNotebooks = useMemo(
    () => notebooks.filter((n) => !n.archivedAt),
    [notebooks]
  );

  const activeDocs = useMemo(
    () =>
      filterAndSortDocuments(documents, {
        filter: 'all',
        sort: 'updated-desc',
        query: searchQuery,
      }),
    [documents, searchQuery]
  );

  const getNotebookCount = (nbId: string) =>
    documents.filter((d) => d.notebookId === nbId && !d.deletedAt && !d.isArchived).length;

  const handleQuickCreateNote = async () => {
    const doc = await createDocument({ title: 'Untitled Note' });
    setFabOpen(false);
    navigate({ name: 'editor', documentId: doc.id });
  };

  const handleCreateChecklist = async () => {
    const doc = await createDocument({
      title: 'Quick Checklist',
      content: {
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First item' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second item' }] }],
              },
            ],
          },
        ],
      },
      html: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>First item</p></li><li data-type="taskItem" data-checked="false"><p>Second item</p></li></ul>',
    });
    setFabOpen(false);
    navigate({ name: 'editor', documentId: doc.id });
  };

  const handleCreateDrawingDoc = async () => {
    const doc = await createDocument({ title: 'Sketch Note' });
    setFabOpen(false);
    navigate({ name: 'editor', documentId: doc.id });
    showToast('Open Insert → Drawing inside the editor to start sketching', 'info');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importDocumentFile(file);
      const doc = await createDocument({
        title: imported.title,
        html: imported.html,
        content: {
          type: 'doc',
          content: imported.plainText
            .split(/\n+/)
            .filter(Boolean)
            .map((line) => ({
              type: 'paragraph',
              content: [{ type: 'text', text: line }],
            })),
        },
      });
      setFabOpen(false);
      showToast(`Imported ${imported.sourceFormat} document`, 'success');
      navigate({ name: 'editor', documentId: doc.id });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to import file', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleCreateNotebookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nbName.trim()) return;
    const nb = await createNotebook({
      name: nbName.trim(),
      description: nbDesc.trim(),
      icon: nbIcon,
      color: nbColor,
    });
    setNbName('');
    setNbDesc('');
    setNewNbOpen(false);
    showToast(`Created "${nb.name}" notebook`, 'success');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-28 md:pb-12 space-y-6">
      {/* Header matching Reference 2 */}
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#92909D]">{formattedDate}</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#24232B] dark:text-[#F4F3F8] tracking-tight mt-0.5 truncate">
            {greeting}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleQuickCreateNote}
          aria-label="Quick create note"
          className="w-11 h-11 rounded-full bg-[var(--notely-accent)] hover:bg-[var(--notely-accent-deep)] text-white flex items-center justify-center shadow-md transition-transform active:scale-95 shrink-0 cursor-pointer"
        >
          <SquarePen className="w-5 h-5" />
        </button>
      </header>

      {/* Global Search */}
      <div>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={() => {
            if (searchQuery.trim()) {
              navigate({ name: 'search', initialQuery: searchQuery.trim() });
            }
          }}
          placeholder="Search notes, tables, ideas..."
        />
      </div>

      {/* Quick organized views strip for mobile & fast access */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => navigate({ name: 'collection', filter: 'all' })}
          className="px-3.5 py-1.5 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] hover:text-[var(--notely-accent)] whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          All Notes
        </button>
        <button
          type="button"
          onClick={() => navigate({ name: 'collection', filter: 'pinned' })}
          className="px-3.5 py-1.5 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] hover:text-[var(--notely-accent)] whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Pin className="w-3.5 h-3.5" />
          Pinned
        </button>
        <button
          type="button"
          onClick={() => navigate({ name: 'collection', filter: 'starred' })}
          className="px-3.5 py-1.5 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] hover:text-[var(--notely-accent)] whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Star className="w-3.5 h-3.5" />
          Starred
        </button>
        <button
          type="button"
          onClick={() => navigate({ name: 'templates' })}
          className="px-3.5 py-1.5 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] hover:text-[var(--notely-accent)] whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Templates
        </button>
        <button
          type="button"
          onClick={() => navigate({ name: 'collection', filter: 'archived' })}
          className="px-3.5 py-1.5 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] hover:text-[var(--notely-accent)] whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Archive className="w-3.5 h-3.5" />
          Archived
        </button>
        <button
          type="button"
          onClick={() => navigate({ name: 'collection', filter: 'trash' })}
          className="px-3.5 py-1.5 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] hover:text-[var(--notely-accent)] whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Trash
        </button>
      </div>

      {/* Notebooks Section */}
      <section aria-labelledby="home-notebooks-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="home-notebooks-heading"
            className="text-lg font-bold text-[#24232B] dark:text-[#F4F3F8]"
          >
            Notebooks
          </h2>
          <button
            type="button"
            onClick={() => navigate({ name: 'notebooks' })}
            className="text-xs font-semibold text-[var(--notely-accent)] hover:underline cursor-pointer"
          >
            See all
          </button>
        </div>

        <div className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto no-scrollbar pb-1">
          {activeNotebooks.map((nb) => (
            <NotebookCard
              key={nb.id}
              notebook={nb}
              noteCount={getNotebookCount(nb.id)}
              onOpen={() => navigate({ name: 'notebook-detail', notebookId: nb.id })}
            />
          ))}
        </div>
      </section>

      {/* Recent Notes Section */}
      <section aria-labelledby="home-recent-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="home-recent-heading"
            className="text-lg font-bold text-[#24232B] dark:text-[#F4F3F8]"
          >
            {searchQuery.trim() ? 'Matching notes' : 'Recent notes'}
          </h2>
          <button
            type="button"
            onClick={() => navigate({ name: 'search', initialQuery: searchQuery })}
            className="text-xs font-semibold text-[var(--notely-accent)] hover:underline cursor-pointer"
          >
            Advanced search
          </button>
        </div>

        {activeDocs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={searchQuery ? 'No matching notes' : 'No notes yet'}
            description={
              searchQuery
                ? `Nothing matched "${searchQuery}". Try another keyword or search across archived notes.`
                : 'Tap the + button to create your first rich-text note or document.'
            }
            action={
              <button
                type="button"
                onClick={handleQuickCreateNote}
                className="px-4 py-2 rounded-xl bg-[var(--notely-accent)] text-white text-xs font-semibold cursor-pointer"
              >
                Create Note
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeDocs.map((doc) => (
              <NoteCard
                key={doc.id}
                doc={doc}
                notebook={notebooks.find((n) => n.id === doc.notebookId)}
                onOpen={() => navigate({ name: 'editor', documentId: doc.id })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating Action Button matching Reference 2 */}
      <button
        type="button"
        onClick={() => setFabOpen(true)}
        aria-label="Create new item"
        className="fixed right-5 bottom-20 md:bottom-8 z-30 w-14 h-14 rounded-2xl bg-[var(--notely-accent)] hover:bg-[var(--notely-accent-deep)] text-white shadow-xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Hidden file input for Import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.md,.markdown,.html,.htm,.rtf,.docx,.odt,.pdf"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Creation Menu Bottom Sheet */}
      <BottomSheet open={fabOpen} onClose={() => setFabOpen(false)} title="Create new">
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button
            type="button"
            onClick={handleQuickCreateNote}
            className="notely-card rounded-2xl p-4 flex items-center gap-3 text-left hover:border-[var(--notely-accent)]/50 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F0E9FF] text-[#8950F5] flex items-center justify-center shrink-0">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">New Note</div>
              <div className="text-[11px] text-[#92909D]">Blank document</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFabOpen(false);
              navigate({ name: 'templates' });
            }}
            className="notely-card rounded-2xl p-4 flex items-center gap-3 text-left hover:border-[var(--notely-accent)]/50 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">New Document</div>
              <div className="text-[11px] text-[#92909D]">From templates</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleCreateChecklist}
            className="notely-card rounded-2xl p-4 flex items-center gap-3 text-left hover:border-[var(--notely-accent)]/50 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E8F8F0] text-[#22C55E] flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">New Checklist</div>
              <div className="text-[11px] text-[#92909D]">Tasks & to-dos</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleCreateDrawingDoc}
            className="notely-card rounded-2xl p-4 flex items-center gap-3 text-left hover:border-[var(--notely-accent)]/50 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FCE8F3] text-[#EC4899] flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">New Drawing</div>
              <div className="text-[11px] text-[#92909D]">Sketch & ink</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFabOpen(false);
              setNewNbOpen(true);
            }}
            className="notely-card rounded-2xl p-4 flex items-center gap-3 text-left hover:border-[var(--notely-accent)]/50 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFF6D9] text-[#EAB308] flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">New Notebook</div>
              <div className="text-[11px] text-[#92909D]">Organize topics</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="notely-card rounded-2xl p-4 flex items-center gap-3 text-left hover:border-[var(--notely-accent)]/50 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E6FAF8] text-[#14B8A6] flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">Import File</div>
              <div className="text-[11px] text-[#92909D]">DOCX, PDF, MD, TXT</div>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* New Notebook Modal */}
      <BottomSheet open={newNbOpen} onClose={() => setNewNbOpen(false)} title="New notebook">
        <form onSubmit={handleCreateNotebookSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] mb-1.5">
              Notebook name
            </label>
            <input
              type="text"
              required
              value={nbName}
              onChange={(e) => setNbName(e.target.value)}
              placeholder="e.g., Research, Travel, Finance"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm text-[#24232B] dark:text-[#F4F3F8] outline-none focus:ring-2 focus:ring-[var(--notely-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={nbDesc}
              onChange={(e) => setNbDesc(e.target.value)}
              placeholder="What belongs in this notebook?"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm text-[#24232B] dark:text-[#F4F3F8] outline-none focus:ring-2 focus:ring-[var(--notely-accent)]"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] mb-1.5">
                Color
              </div>
              <div className="flex items-center gap-2">
                {(['purple', 'blue', 'green', 'yellow', 'pink', 'teal'] as CardColorKey[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setNbColor(c)}
                    className={`w-7 h-7 rounded-full cursor-pointer ${
                      nbColor === c ? 'ring-2 ring-offset-2 ring-[var(--notely-accent)]' : ''
                    }`}
                    style={{
                      backgroundColor:
                        c === 'purple'
                          ? '#8950F5'
                          : c === 'blue'
                            ? '#3B82F6'
                            : c === 'green'
                              ? '#22C55E'
                              : c === 'yellow'
                                ? '#EAB308'
                                : c === 'pink'
                                  ? '#EC4899'
                                  : '#14B8A6',
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#5C5A68] dark:text-[#B2B0BE] mb-1.5">
                Icon
              </div>
              <select
                value={nbIcon}
                onChange={(e) => setNbIcon(e.target.value as NotebookIconKey)}
                aria-label="Notebook icon"
                className="h-9 px-2.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-medium text-[#24232B] dark:text-[#F4F3F8]"
              >
                <option value="book">Book</option>
                <option value="briefcase">Briefcase</option>
                <option value="lightbulb">Lightbulb</option>
                <option value="graduation">Graduation</option>
                <option value="folder">Folder</option>
                <option value="code">Code</option>
                <option value="heart">Heart</option>
                <option value="star">Star</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewNbOpen(false)}
              className="px-4 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm font-semibold text-[#5C5A68] dark:text-[#B2B0BE] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 h-10 rounded-xl bg-[var(--notely-accent)] text-white text-sm font-semibold cursor-pointer"
            >
              Create Notebook
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
