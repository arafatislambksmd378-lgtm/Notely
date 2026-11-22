import React from 'react';
import {
  Archive,
  BookOpen,
  FileText,
  Home,
  LayoutTemplate,
  Pin,
  Search,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';
import { useNotely } from '../context/NotelyContext';

export function BottomNavigation() {
  const { route, navigate, documents, user } = useNotely();

  const isHome = route.name === 'home';
  const isNotebooks = route.name === 'notebooks' || route.name === 'notebook-detail';
  const isSettings = route.name === 'settings';

  const activeDocs = documents.filter((d) => !d.deletedAt && !d.isArchived);
  const pinnedCount = activeDocs.filter((d) => d.isPinned).length;
  const starredCount = activeDocs.filter((d) => d.isFavorite).length;
  const archivedCount = documents.filter((d) => !d.deletedAt && d.isArchived).length;
  const trashCount = documents.filter((d) => Boolean(d.deletedAt)).length;

  return (
    <>
      {/* Mobile Bottom Navigation (3 primary destinations matching reference design) */}
      <nav
        aria-label="Primary navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#16151E]/95 backdrop-blur-md border-t border-[#ECEAF1] dark:border-[#2A2838] h-16 px-4 grid grid-cols-3 items-center"
      >
        <button
          type="button"
          onClick={() => navigate({ name: 'home' })}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors cursor-pointer ${
            isHome ? 'text-[var(--notely-accent)]' : 'text-[#92909D]'
          }`}
        >
          <Home className={`w-5 h-5 ${isHome ? 'fill-current/15' : ''}`} />
          <span className="text-[11px] font-semibold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ name: 'notebooks' })}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors cursor-pointer ${
            isNotebooks ? 'text-[var(--notely-accent)]' : 'text-[#92909D]'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${isNotebooks ? 'fill-current/15' : ''}`} />
          <span className="text-[11px] font-semibold">Notebooks</span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ name: 'settings' })}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors cursor-pointer ${
            isSettings ? 'text-[var(--notely-accent)]' : 'text-[#92909D]'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Settings</span>
        </button>
      </nav>

      {/* Desktop / Tablet Sidebar Rail */}
      <aside
        aria-label="Workspace sidebar"
        className="hidden md:flex flex-col w-64 shrink-0 border-r border-[#ECEAF1] dark:border-[#2A2838] bg-[#FBFBFD] dark:bg-[#13121B] min-h-screen p-4 justify-between"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--notely-accent)] text-white flex items-center justify-center font-bold shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-[#24232B] dark:text-[#F4F3F8] leading-tight">
                Notely
              </div>
              <div className="text-[11px] text-[#92909D] truncate">{user.workspaceName}</div>
            </div>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => navigate({ name: 'home' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                isHome
                  ? 'bg-[var(--notely-accent-light)] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <Home className="w-4.5 h-4.5" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'notebooks' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                isNotebooks
                  ? 'bg-[var(--notely-accent-light)] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <BookOpen className="w-4.5 h-4.5" />
              <span>Notebooks</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'settings' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                isSettings
                  ? 'bg-[var(--notely-accent-light)] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
              <span>Settings</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#ECEAF1] dark:border-[#2A2838] space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-[#92909D] uppercase">
              Library
            </div>
            <button
              type="button"
              onClick={() => navigate({ name: 'collection', filter: 'all' })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                route.name === 'collection' && route.filter === 'all'
                  ? 'bg-[#F0E9FF] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                All Notes
              </span>
              <span className="tabular-nums text-[#92909D]">{activeDocs.length}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'collection', filter: 'pinned' })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                route.name === 'collection' && route.filter === 'pinned'
                  ? 'bg-[#F0E9FF] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Pin className="w-4 h-4" />
                Pinned
              </span>
              <span className="tabular-nums text-[#92909D]">{pinnedCount}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'collection', filter: 'starred' })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                route.name === 'collection' && route.filter === 'starred'
                  ? 'bg-[#F0E9FF] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Star className="w-4 h-4" />
                Starred
              </span>
              <span className="tabular-nums text-[#92909D]">{starredCount}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'templates' })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                route.name === 'templates'
                  ? 'bg-[#F0E9FF] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutTemplate className="w-4 h-4" />
                Templates
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'search' })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                route.name === 'search'
                  ? 'bg-[#F0E9FF] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Search className="w-4 h-4" />
                Search
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'collection', filter: 'archived' })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                route.name === 'collection' && route.filter === 'archived'
                  ? 'bg-[#F0E9FF] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Archive className="w-4 h-4" />
                Archived
              </span>
              <span className="tabular-nums text-[#92909D]">{archivedCount}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'collection', filter: 'trash' })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                route.name === 'collection' && route.filter === 'trash'
                  ? 'bg-[#F0E9FF] dark:bg-[#2A2145] text-[var(--notely-accent)]'
                  : 'text-[#5C5A68] dark:text-[#A5A3B2] hover:bg-[#F1EFF7] dark:hover:bg-[#1E1C2A]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4" />
                Trash
              </span>
              <span className="tabular-nums text-[#92909D]">{trashCount}</span>
            </button>
          </div>
        </div>

        <div className="px-3 py-2 text-[11px] text-[#92909D]">
          {user.name} · {user.workspaceDescription}
        </div>
      </aside>
    </>
  );
}
