import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Copy,
  Edit2,
  FileText,
  LayoutTemplate,
  Pin,
  Plus,
  RotateCcw,
  Search as SearchIcon,
  Star,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react';
import { useNotely } from '../context/NotelyContext';
import {
  AppButton,
  BottomSheet,
  ConfirmationDialog,
  EmptyState,
  NoteCard,
  SearchBar,
} from './DesignSystem';
import { CARD_COLORS, type CardColorKey } from '../types/notely';

export function CollectionScreen({
  filter,
}: {
  filter: 'all' | 'recent' | 'starred' | 'pinned' | 'archived' | 'trash';
}) {
  const {
    documents,
    notebooks,
    goBack,
    navigate,
    restoreDocument,
    permanentlyDeleteDocument,
    emptyTrash,
    saveDocument,
  } = useNotely();
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);

  const titles: Record<typeof filter, string> = {
    all: 'All Notes',
    recent: 'Recent Notes',
    starred: 'Starred Notes',
    pinned: 'Pinned Notes',
    archived: 'Archived Notes',
    trash: 'Trash',
  };

  const filtered = useMemo(() => {
    const list = documents.filter((d) => {
      if (filter === 'trash') return Boolean(d.deletedAt);
      if (d.deletedAt) return false;
      if (filter === 'archived') return d.isArchived;
      if (d.isArchived) return false;
      if (filter === 'starred') return d.isFavorite;
      if (filter === 'pinned') return d.isPinned;
      return true;
    });
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [documents, filter]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-28 md:pb-12 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] flex items-center justify-center text-[#24232B] dark:text-[#F4F3F8] cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#24232B] dark:text-[#F4F3F8]">
              {titles[filter]}
            </h1>
            <p className="text-xs text-[#92909D] tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
        </div>

        {filter === 'trash' && filtered.length > 0 && (
          <AppButton variant="danger" size="sm" onClick={() => setConfirmEmptyOpen(true)}>
            Empty Trash
          </AppButton>
        )}
      </header>

      {filtered.length === 0 ? (
        <EmptyState
          icon={
            filter === 'trash' ? (
              <Trash2 className="w-6 h-6" />
            ) : filter === 'starred' ? (
              <Star className="w-6 h-6" />
            ) : filter === 'pinned' ? (
              <Pin className="w-6 h-6" />
            ) : filter === 'archived' ? (
              <Archive className="w-6 h-6" />
            ) : (
              <FileText className="w-6 h-6" />
            )
          }
          title={`No ${titles[filter].toLowerCase()}`}
          description="Notes matching this category will appear here automatically."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex flex-col gap-1.5">
              <NoteCard
                doc={doc}
                notebook={notebooks.find((n) => n.id === doc.notebookId)}
                onOpen={() => {
                  if (filter !== 'trash') {
                    navigate({ name: 'editor', documentId: doc.id });
                  }
                }}
              />
              {filter === 'trash' && (
                <div className="flex items-center justify-end gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => restoreDocument(doc.id)}
                    className="text-xs font-semibold text-[var(--notely-accent)] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => permanentlyDeleteDocument(doc.id)}
                    className="text-xs font-semibold text-[#EF4444] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete permanently
                  </button>
                </div>
              )}
              {filter === 'archived' && (
                <div className="flex items-center justify-end px-1">
                  <button
                    type="button"
                    onClick={() => saveDocument(doc.id, { isArchived: false })}
                    className="text-xs font-semibold text-[var(--notely-accent)] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Unarchive
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={confirmEmptyOpen}
        title="Empty Trash?"
        message="This will permanently delete all notes currently in Trash. This cannot be undone."
        confirmLabel="Empty Trash"
        danger
        onCancel={() => setConfirmEmptyOpen(false)}
        onConfirm={async () => {
          await emptyTrash();
          setConfirmEmptyOpen(false);
        }}
      />
    </div>
  );
}

export function TemplatesScreen() {
  const {
    templates,
    documents,
    goBack,
    navigate,
    createDocument,
    createCustomTemplate,
    duplicateTemplate,
    deleteTemplate,
    updateTemplate,
  } = useNotely();

  const [category, setCategory] = useState<string>('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [sourceDocId, setSourceDocId] = useState(documents[0]?.id ?? '');
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('Custom');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(templates.map((t) => t.category)))],
    [templates]
  );

  const visible = useMemo(
    () => (category === 'All' ? templates : templates.filter((t) => t.category === category)),
    [templates, category]
  );

  const handleUseTemplate = async (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    const doc = await createDocument({
      title: tpl.name === 'Blank Document' ? 'Untitled Note' : tpl.name,
      content: JSON.parse(JSON.stringify(tpl.content)),
      html: tpl.htmlContent,
      cardColor: tpl.color,
    });
    navigate({ name: 'editor', documentId: doc.id });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-28 md:pb-12 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] flex items-center justify-center text-[#24232B] dark:text-[#F4F3F8] cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#24232B] dark:text-[#F4F3F8]">Templates</h1>
            <p className="text-xs text-[#92909D]">Start faster with structured layouts</p>
          </div>
        </div>
        <AppButton size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Save Custom
        </AppButton>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              category === cat
                ? 'bg-[var(--notely-accent)] text-white'
                : 'bg-[#F4F3F8] dark:bg-[#1B1A26] text-[#5C5A68] dark:text-[#B2B0BE]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {visible.map((tpl) => {
          const color = CARD_COLORS[tpl.color] ?? CARD_COLORS.purple;
          return (
            <div key={tpl.id} className="notely-card rounded-3xl p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: color.lightHex, color: color.hex }}
                  >
                    <LayoutTemplate className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#92909D]">{tpl.category}</span>
                </div>
                <h3 className="text-[15px] font-bold text-[#24232B] dark:text-[#F4F3F8] mt-3">
                  {tpl.name}
                </h3>
                <p className="text-xs text-[#92909D] mt-1 leading-relaxed">{tpl.description}</p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#ECEAF1] dark:border-[#2A2838]">
                <button
                  type="button"
                  onClick={() => handleUseTemplate(tpl.id)}
                  className="text-xs font-bold text-[var(--notely-accent)] hover:underline cursor-pointer"
                >
                  Use template →
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Duplicate ${tpl.name}`}
                    onClick={() => duplicateTemplate(tpl.id)}
                    className="p-1.5 rounded-lg text-[#92909D] hover:text-[#24232B] dark:hover:text-white cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {tpl.isCustom && (
                    <>
                      <button
                        type="button"
                        aria-label={`Rename ${tpl.name}`}
                        onClick={() => {
                          setEditingId(tpl.id);
                          setEditName(tpl.name);
                        }}
                        className="p-1.5 rounded-lg text-[#92909D] hover:text-[#24232B] dark:hover:text-white cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${tpl.name}`}
                        onClick={() => deleteTemplate(tpl.id)}
                        className="p-1.5 rounded-lg text-[#EF4444] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BottomSheet open={createOpen} onClose={() => setCreateOpen(false)} title="Save note as template">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!sourceDocId) return;
            await createCustomTemplate(sourceDocId, tplName, tplCategory);
            setTplName('');
            setCreateOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Source note</label>
            <select
              value={sourceDocId}
              onChange={(e) => setSourceDocId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            >
              {documents
                .filter((d) => !d.deletedAt)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Template name</label>
            <input
              type="text"
              required
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="e.g. Sprint Retro"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Category</label>
            <input
              type="text"
              value={tplCategory}
              onChange={(e) => setTplCategory(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Create Template</AppButton>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet open={Boolean(editingId)} onClose={() => setEditingId(null)} title="Rename template">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (editingId && editName.trim()) {
              await updateTemplate(editingId, { name: editName.trim() });
              setEditingId(null);
            }
          }}
          className="space-y-4"
        >
          <input
            type="text"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
          />
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setEditingId(null)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Save</AppButton>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}

export function SearchScreen({ initialQuery = '' }: { initialQuery?: string }) {
  const {
    documents,
    notebooks,
    tags,
    comments,
    bookmarks,
    recentSearches,
    recordSearchQuery,
    createTag,
    deleteTag,
    goBack,
    navigate,
  } = useNotely();

  const [query, setQuery] = useState(initialQuery);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<CardColorKey>('purple');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (doc.deletedAt) return false;
      if (!includeArchived && doc.isArchived) return false;
      if (selectedTagId && !doc.tagIds.includes(selectedTagId)) return false;
      if (!q) return true;

      const nbName = notebooks.find((n) => n.id === doc.notebookId)?.name.toLowerCase() ?? '';
      const docTagNames = tags
        .filter((t) => doc.tagIds.includes(t.id))
        .map((t) => t.name.toLowerCase())
        .join(' ');
      const docComments = comments
        .filter((c) => c.documentId === doc.id)
        .map((c) => c.content.toLowerCase())
        .join(' ');
      const docBookmarks = bookmarks
        .filter((b) => b.documentId === doc.id)
        .map((b) => b.name.toLowerCase())
        .join(' ');

      return (
        doc.title.toLowerCase().includes(q) ||
        doc.plainTextCache.toLowerCase().includes(q) ||
        nbName.includes(q) ||
        docTagNames.includes(q) ||
        docComments.includes(q) ||
        docBookmarks.includes(q)
      );
    });
  }, [documents, notebooks, tags, comments, bookmarks, query, selectedTagId, includeArchived]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-28 md:pb-12 space-y-5">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="w-10 h-10 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] flex items-center justify-center text-[#24232B] dark:text-[#F4F3F8] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={() => recordSearchQuery(query)}
            autoFocus
            placeholder="Search titles, content, tags, comments, bookmarks..."
          />
        </div>
      </header>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !query && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#92909D]">Recent:</span>
          {recentSearches.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setQuery(item)}
              className="px-3 py-1 rounded-xl bg-[#F4F3F8] dark:bg-[#1B1A26] text-xs font-medium text-[#5C5A68] dark:text-[#B2B0BE] cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Tags Filter & Tag Manager */}
      <div className="notely-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#24232B] dark:text-[#F4F3F8]">
            <TagIcon className="w-4 h-4 text-[var(--notely-accent)]" />
            Filter by Tags
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-[#5C5A68] dark:text-[#B2B0BE] cursor-pointer">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="accent-[var(--notely-accent)]"
            />
            Include archived
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedTagId(null)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
              selectedTagId === null
                ? 'bg-[var(--notely-accent)] text-white'
                : 'bg-[#F4F3F8] dark:bg-[#242232] text-[#5C5A68] dark:text-[#B2B0BE]'
            }`}
          >
            All Tags
          </button>
          {tags.map((t) => {
            const c = CARD_COLORS[t.color] ?? CARD_COLORS.purple;
            const active = selectedTagId === t.id;
            return (
              <div key={t.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTagId(active ? null : t.id)}
                  className="px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: active ? c.hex : c.lightHex,
                    color: active ? '#FFFFFF' : c.hex,
                  }}
                >
                  #{t.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete tag ${t.name}`}
                  onClick={() => deleteTag(t.id)}
                  className="text-[#92909D] hover:text-[#EF4444] text-xs px-1 cursor-pointer"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newTagName.trim()) return;
            await createTag(newTagName.trim(), newTagColor);
            setNewTagName('');
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name..."
            className="h-9 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs flex-1 outline-none"
          />
          <select
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value as CardColorKey)}
            aria-label="Tag color"
            className="h-9 px-2 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
          >
            <option value="purple">Purple</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="pink">Pink</option>
          </select>
          <AppButton type="submit" size="sm">
            Add Tag
          </AppButton>
        </form>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="w-6 h-6" />}
          title="No matches found"
          description="Try adjusting your search keywords, tags, or archive toggle."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {results.map((doc) => (
            <NoteCard
              key={doc.id}
              doc={doc}
              notebook={notebooks.find((n) => n.id === doc.notebookId)}
              onOpen={() => {
                if (query.trim()) recordSearchQuery(query);
                navigate({ name: 'editor', documentId: doc.id });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
