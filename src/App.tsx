import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { NotelyProvider, useNotely } from './context/NotelyContext';
import { BottomNavigation } from './components/BottomNavigation';
import { HomeScreen } from './components/HomeScreen';
import { NotebookDetailScreen, NotebooksScreen } from './components/NotebooksScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { EditorScreen } from './components/EditorScreen';
import {
  CollectionScreen,
  SearchScreen,
  TemplatesScreen,
} from './components/OrganizedViewsScreen';
import { PinLockScreen } from './components/PinLockScreen';
import { LoadingIndicator } from './components/DesignSystem';

import { sanitizeHtml } from './utils/documentUtils';

function SharedLinkViewer({
  token,
  onExit,
}: {
  token: string;
  onExit: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [editors, setEditors] = useState<Array<{ name: string; lastSeen: string }>>([]);

  useEffect(() => {
    fetch(`/api/shares/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || 'Share link unavailable');
        }
        return r.json();
      })
      .then((data) => {
        setTitle(data.share.title);
        setHtml(sanitizeHtml(data.share.html || ''));
        setPermission(data.share.permission);
        setEditors(data.share.activeEditors || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load shared note');
        setLoading(false);
      });

    const es = new EventSource(`/api/collab/${encodeURIComponent(token)}/events`);
    es.addEventListener('doc-update', (ev) => {
      const payload = JSON.parse((ev as MessageEvent).data);
      setTitle(payload.title);
      setHtml(sanitizeHtml(payload.html || ''));
      setEditors(payload.activeEditors || []);
    });
    es.addEventListener('revoked', () => {
      setError('Access to this shared document has been revoked.');
    });
    return () => es.close();
  }, [token]);

  const handleEditPush = async (nextHtml: string) => {
    const clean = sanitizeHtml(nextHtml);
    setHtml(clean);
    await fetch(`/api/collab/${encodeURIComponent(token)}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, html: clean, authorName: 'Guest Collaborator' }),
    });
  };

  if (loading) return <LoadingIndicator label="Opening shared document..." />;

  return (
    <div className="min-h-screen bg-[#F5F4F9] dark:bg-[#0E0D14] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-[var(--notely-accent)]">
              Shared Document · {permission === 'edit' ? 'Live Collaborative Edit' : 'View Only'}
            </div>
            <h1 className="text-2xl font-bold text-[#24232B] dark:text-[#F4F3F8]">{title}</h1>
            {editors.length > 0 && (
              <div className="text-xs text-[#92909D] mt-0.5">
                Active collaborators: {editors.map((e) => e.name).join(', ')}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onExit}
            className="px-4 h-10 rounded-xl bg-[var(--notely-accent)] text-white text-xs font-semibold cursor-pointer"
          >
            Open My Workspace
          </button>
        </div>

        {error ? (
          <div className="notely-card rounded-3xl p-6 text-sm text-[#EF4444]">{error}</div>
        ) : (
          <div className="notely-card rounded-3xl p-6 bg-white dark:bg-[#1B1A26]">
            {permission === 'edit' ? (
              <textarea
                rows={14}
                value={html.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n').trim()}
                onChange={(e) => {
                  const lines = e.target.value
                    .split('\n')
                    .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                  handleEditPush(lines.map((l) => `<p>${l}</p>`).join(''));
                }}
                className="w-full bg-transparent outline-none text-sm leading-relaxed"
              />
            ) : (
              <div
                className="notely-prose text-sm"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotelyShell() {
  const { ready, isAppLocked, route, toasts, dismissToast } = useNotely();
  const [shareToken, setShareToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('share');
  });

  if (shareToken) {
    return (
      <SharedLinkViewer
        token={shareToken}
        onExit={() => {
          window.history.replaceState({}, '', '/');
          setShareToken(null);
        }}
      />
    );
  }

  if (!ready) {
    return <LoadingIndicator />;
  }

  if (isAppLocked) {
    return <PinLockScreen mode="unlock" />;
  }

  const isEditor = route.name === 'editor';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0E0D14] text-[#24232B] dark:text-[#F4F3F8] flex">
      {!isEditor && <BottomNavigation />}

      <div className="flex-1 min-w-0">
        {route.name === 'home' && <HomeScreen />}
        {route.name === 'notebooks' && <NotebooksScreen />}
        {route.name === 'notebook-detail' && <NotebookDetailScreen notebookId={route.notebookId} />}
        {route.name === 'settings' && <SettingsScreen />}
        {route.name === 'editor' && <EditorScreen documentId={route.documentId} />}
        {route.name === 'collection' && <CollectionScreen filter={route.filter} />}
        {route.name === 'templates' && <TemplatesScreen />}
        {route.name === 'search' && <SearchScreen initialQuery={route.initialQuery} />}
      </div>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-lg text-xs font-semibold flex items-center justify-between gap-2 border ${
                t.tone === 'error'
                  ? 'bg-[#FEECEC] text-[#B91C1C] border-[#FECACA]'
                  : t.tone === 'success'
                    ? 'bg-[#E8F8F0] text-[#15803D] border-[#BBF7D0]'
                    : 'bg-white dark:bg-[#1B1A26] text-[#24232B] dark:text-[#F4F3F8] border-[#ECEAF1] dark:border-[#2A2838]'
              }`}
            >
              <span>{t.text}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(t.id)}
                className="opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <NotelyProvider>
      <NotelyShell />
    </NotelyProvider>
  );
}
