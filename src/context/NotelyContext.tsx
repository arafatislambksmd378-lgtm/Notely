import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ACCENT_COLORS,
  DEFAULT_PAGE_SETUP,
  type AccentColorKey,
  type AppRoute,
  type CardColorKey,
  type DocumentBookmark,
  type DocumentComment,
  type DocumentRecord,
  type DocumentShare,
  type DocumentTemplate,
  type DocumentVersion,
  type MediaAsset,
  type Notebook,
  type NotebookIconKey,
  type PageSetup,
  type StructuredContent,
  type Tag,
  type ThemeMode,
  type UserProfile,
  type UserSettings,
} from '../types/notely';
import {
  buildBackupJson,
  calculateStorageBreakdown,
  clearStore,
  decryptNotePayload,
  deleteFromStore,
  encryptNotePayload,
  getByIdFromStore,
  getOrCreateDeviceSyncSecret,
  initializeAndLoadDatabase,
  putInStore,
  putManyInStore,
  restoreBackupJson,
  type NotelyDatabaseSnapshot,
} from '../db/localDatabase';
import { extractPlainText, hashPin } from '../utils/documentUtils';

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface NotelyContextValue {
  ready: boolean;
  isOnline: boolean;
  isAppLocked: boolean;
  route: AppRoute;
  navigate: (next: AppRoute) => void;
  goBack: () => void;

  user: UserProfile;
  settings: UserSettings;
  notebooks: Notebook[];
  documents: DocumentRecord[];
  versions: DocumentVersion[];
  tags: Tag[];
  comments: DocumentComment[];
  bookmarks: DocumentBookmark[];
  media: MediaAsset[];
  shares: DocumentShare[];
  templates: DocumentTemplate[];
  recentSearches: string[];
  toasts: ToastMessage[];
  storageBreakdown: ReturnType<typeof calculateStorageBreakdown>;

  showToast: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;

  // Theme & Profile
  setTheme: (theme: ThemeMode) => Promise<void>;
  setAccentColor: (accent: AccentColorKey) => Promise<void>;
  updateUserProfile: (patch: Partial<UserProfile>) => Promise<void>;
  updateEditorPreferences: (patch: Partial<UserSettings['editorPreferences']>) => Promise<void>;

  // Security & App Lock
  setupOrChangePin: (pin: string) => Promise<void>;
  toggleAppLock: (enabled: boolean) => Promise<void>;
  toggleBiometric: (enabled: boolean) => Promise<void>;
  verifyPinAndUnlockApp: (pin: string) => Promise<boolean>;
  verifyBiometricAndUnlockApp: () => Promise<{ ok: boolean; reason?: string }>;
  lockAppNow: () => void;
  toggleDocumentLock: (docId: string, pinOrPass: string) => Promise<boolean>;
  unlockPrivateDocument: (docId: string, pinOrPass: string) => Promise<boolean>;

  // Notebooks
  createNotebook: (input: {
    name: string;
    description?: string;
    icon: NotebookIconKey;
    color: CardColorKey;
  }) => Promise<Notebook>;
  updateNotebook: (id: string, patch: Partial<Notebook>) => Promise<void>;
  archiveNotebook: (id: string, archive: boolean) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;

  // Documents
  createDocument: (input?: {
    title?: string;
    notebookId?: string;
    content?: StructuredContent;
    html?: string;
    cardColor?: CardColorKey;
    pageSetup?: PageSetup;
  }) => Promise<DocumentRecord>;
  saveDocument: (
    id: string,
    patch: Partial<DocumentRecord>,
    options?: { createAutoVersion?: boolean }
  ) => Promise<DocumentRecord | undefined>;
  duplicateDocument: (id: string) => Promise<DocumentRecord | undefined>;
  moveDocument: (id: string, targetNotebookId: string) => Promise<void>;
  mergeDocuments: (sourceId: string, targetId: string) => Promise<void>;
  trashDocument: (id: string) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;
  permanentlyDeleteDocument: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;

  // Versions
  createManualVersion: (docId: string, label: string) => Promise<DocumentVersion | undefined>;
  restoreVersion: (docId: string, versionId: string) => Promise<DocumentRecord | undefined>;
  deleteVersion: (versionId: string) => Promise<void>;

  // Comments & Bookmarks & Tags & Media
  addComment: (docId: string, content: string, anchorText: string) => Promise<DocumentComment>;
  replyToComment: (commentId: string, replyText: string) => Promise<void>;
  toggleResolveComment: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  addBookmark: (docId: string, name: string, anchorReference: string) => Promise<DocumentBookmark>;
  renameBookmark: (bookmarkId: string, name: string) => Promise<void>;
  deleteBookmark: (bookmarkId: string) => Promise<void>;
  createTag: (name: string, color: CardColorKey) => Promise<Tag>;
  renameTag: (tagId: string, name: string) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  toggleDocumentTag: (docId: string, tagId: string) => Promise<void>;
  recordMediaAsset: (asset: Omit<MediaAsset, 'id' | 'createdAt'>) => Promise<MediaAsset>;

  // Templates
  createCustomTemplate: (docId: string, name: string, category: string) => Promise<DocumentTemplate | undefined>;
  updateTemplate: (id: string, patch: Partial<DocumentTemplate>) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<DocumentTemplate | undefined>;
  deleteTemplate: (id: string) => Promise<void>;

  // Search, Backup, Cloud Sync & Shares
  recordSearchQuery: (q: string) => Promise<void>;
  clearTemporaryData: () => Promise<void>;
  exportWorkspaceBackup: () => string;
  importWorkspaceBackup: (rawJson: string) => Promise<void>;
  syncPushToCloud: () => Promise<boolean>;
  syncPullFromCloud: () => Promise<boolean>;
  createDocumentShare: (docId: string, permission: 'view' | 'edit', expiresHours?: number) => Promise<DocumentShare | undefined>;
  revokeDocumentShare: (shareId: string, token: string) => Promise<void>;
}

const NotelyContext = createContext<NotelyContextValue | null>(null);

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function NotelyProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [routeStack, setRouteStack] = useState<AppRoute[]>([{ name: 'home' }]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [snapshot, setSnapshot] = useState<NotelyDatabaseSnapshot | null>(null);
  const snapshotRef = useRef<NotelyDatabaseSnapshot | null>(null);
  const autoVersionTracker = useRef<Record<string, number>>({});

  const commitSnapshot = useCallback(
    (updater: (prev: NotelyDatabaseSnapshot | null) => NotelyDatabaseSnapshot | null) => {
      const next = updater(snapshotRef.current);
      snapshotRef.current = next;
      setSnapshot(next);
      return next;
    },
    []
  );

  const showToast = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    const id = makeId('toast');
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let mounted = true;
    initializeAndLoadDatabase().then((data) => {
      if (!mounted) return;
      snapshotRef.current = data;
      setSnapshot(data);
      if (data.settings?.securityPreferences?.appLockEnabled && data.settings.securityPreferences.pinHash) {
        setIsAppLocked(true);
      }
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Apply Dark Mode & Accent Color CSS variables whenever settings change
  useEffect(() => {
    if (!snapshot) return;
    const { theme, accentColor } = snapshot.settings;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const useDark = theme === 'dark' || (theme === 'system' && prefersDark);

    document.documentElement.classList.toggle('dark', useDark);

    const accent = ACCENT_COLORS[accentColor] ?? ACCENT_COLORS.purple;
    document.documentElement.style.setProperty('--notely-accent', accent.primary);
    document.documentElement.style.setProperty('--notely-accent-deep', accent.deep);
    document.documentElement.style.setProperty('--notely-accent-light', accent.light);
  }, [snapshot?.settings.theme, snapshot?.settings.accentColor]);

  const route = routeStack[routeStack.length - 1];

  const navigate = useCallback((next: AppRoute) => {
    setRouteStack((prev) => {
      if (next.name === 'home' || next.name === 'notebooks' || next.name === 'settings') {
        return [next];
      }
      return [...prev, next];
    });
  }, []);

  const goBack = useCallback(() => {
    setRouteStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : [{ name: 'home' }]));
  }, []);

  const updateSettings = useCallback(async (updater: (curr: UserSettings) => UserSettings) => {
    commitSnapshot((prev) => {
      if (!prev) return prev;
      const nextSettings = updater(prev.settings);
      putInStore('settings', nextSettings);
      return { ...prev, settings: nextSettings };
    });
  }, [commitSnapshot]);

  const setTheme = useCallback(
    async (theme: ThemeMode) => {
      await updateSettings((s) => ({ ...s, theme }));
    },
    [updateSettings]
  );

  const setAccentColor = useCallback(
    async (accentColor: AccentColorKey) => {
      await updateSettings((s) => ({ ...s, accentColor }));
    },
    [updateSettings]
  );

  const updateUserProfile = useCallback(async (patch: Partial<UserProfile>) => {
    commitSnapshot((prev) => {
      if (!prev) return prev;
      const updated: UserProfile = {
        ...prev.user,
        ...patch,
        avatar: patch.name ? patch.name.trim().charAt(0).toUpperCase() || prev.user.avatar : prev.user.avatar,
        updatedAt: new Date().toISOString(),
      };
      putInStore('users', updated);
      return { ...prev, user: updated };
    });
  }, [commitSnapshot]);

  const updateEditorPreferences = useCallback(
    async (patch: Partial<UserSettings['editorPreferences']>) => {
      await updateSettings((s) => ({
        ...s,
        editorPreferences: { ...s.editorPreferences, ...patch },
      }));
    },
    [updateSettings]
  );

  const setupOrChangePin = useCallback(
    async (pin: string) => {
      const hashed = await hashPin(pin);
      await updateSettings((s) => ({
        ...s,
        securityPreferences: {
          ...s.securityPreferences,
          pinHash: hashed,
          appLockEnabled: true,
        },
      }));
      showToast('PIN saved and App Lock enabled', 'success');
    },
    [updateSettings, showToast]
  );

  const toggleAppLock = useCallback(
    async (enabled: boolean) => {
      await updateSettings((s) => ({
        ...s,
        securityPreferences: {
          ...s.securityPreferences,
          appLockEnabled: enabled,
        },
      }));
    },
    [updateSettings]
  );

  const toggleBiometric = useCallback(
    async (enabled: boolean) => {
      if (enabled && typeof window !== 'undefined' && navigator.credentials?.create && 'PublicKeyCredential' in window) {
        try {
          const challenge = crypto.getRandomValues(new Uint8Array(32));
          const userId = new TextEncoder().encode(snapshotRef.current?.user.id || 'user-writer');
          const cred = (await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: 'Notely' },
              user: {
                id: userId,
                name: snapshotRef.current?.user.email || 'writer@notely.local',
                displayName: snapshotRef.current?.user.name || 'Writer',
              },
              pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
              authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
              timeout: 30000,
            },
          })) as PublicKeyCredential | null;
          if (cred?.rawId) {
            const rawArr = Array.from(new Uint8Array(cred.rawId));
            await putInStore('meta', { id: 'webauthnCredId', bytes: rawArr });
          }
        } catch {
          showToast('Platform biometric passkey enrollment was skipped or unavailable on this browser', 'info');
        }
      }
      await updateSettings((s) => ({
        ...s,
        securityPreferences: {
          ...s.securityPreferences,
          biometricEnabled: enabled,
        },
      }));
    },
    [updateSettings, showToast]
  );

  const verifyPinAndUnlockApp = useCallback(
    async (pin: string) => {
      const curr = snapshotRef.current;
      if (!curr || !pin) return false;
      const hashed = await hashPin(pin);
      if (hashed === curr.settings.securityPreferences.pinHash) {
        setIsAppLocked(false);
        return true;
      }
      return false;
    },
    []
  );

  const verifyBiometricAndUnlockApp = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    const curr = snapshotRef.current;
    if (!curr?.settings.securityPreferences.biometricEnabled) {
      return { ok: false, reason: 'Biometric unlock is disabled.' };
    }
    if (typeof window === 'undefined' || !navigator.credentials?.get || !('PublicKeyCredential' in window)) {
      return { ok: false, reason: 'Biometric authentication is unavailable here — enter your PIN.' };
    }
    const stored = await getByIdFromStore<{ id: string; bytes: number[] }>('meta', 'webauthnCredId');
    if (!stored?.bytes?.length) {
      return { ok: false, reason: 'No biometric credential enrolled on this browser — enter your PIN.' };
    }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              type: 'public-key',
              id: new Uint8Array(stored.bytes),
            },
          ],
          userVerification: 'required',
          timeout: 30000,
        },
      });
      if (assertion) {
        setIsAppLocked(false);
        return { ok: true };
      }
      return { ok: false, reason: 'Biometric prompt cancelled.' };
    } catch {
      return { ok: false, reason: 'Biometric verification failed — use your 4-digit PIN.' };
    }
  }, []);

  const lockAppNow = useCallback(() => {
    if (snapshotRef.current?.settings.securityPreferences.pinHash) {
      setIsAppLocked(true);
    }
  }, []);

  const toggleDocumentLock = useCallback(
    async (docId: string, pinOrPass: string): Promise<boolean> => {
      const curr = snapshotRef.current;
      if (!curr) return false;
      const doc = curr.documents.find((d) => d.id === docId);
      if (!doc || doc.isLocked) return false;

      const docVersions = curr.versions.filter((v) => v.documentId === docId);
      const encryptedPayload = await encryptNotePayload(
        JSON.stringify({
          content: doc.content,
          htmlCache: doc.htmlCache,
          plainTextCache: doc.plainTextCache,
          versions: docVersions,
        }),
        pinOrPass
      );
      const updated: DocumentRecord = {
        ...doc,
        isLocked: true,
        encryptedPayload,
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Encrypted private note' }] }] },
        htmlCache: '<p>Encrypted private note</p>',
        plainTextCache: 'Encrypted private note',
        updatedAt: new Date().toISOString(),
      };
      const redactedVersions = curr.versions.map((v) =>
        v.documentId === docId
          ? {
              ...v,
              contentSnapshot: { type: 'doc', content: [] },
              htmlSnapshot: '<p>Encrypted</p>',
            }
          : v
      );
      await Promise.all([
        putInStore('documents', updated),
        putManyInStore('versions', redactedVersions.filter((v) => v.documentId === docId)),
      ]);
      commitSnapshot((prev) =>
        prev
          ? {
              ...prev,
              documents: prev.documents.map((d) => (d.id === docId ? updated : d)),
              versions: redactedVersions,
            }
          : prev
      );
      showToast('Note locked with AES-256 encryption', 'success');
      return true;
    },
    [commitSnapshot, showToast]
  );

  const unlockPrivateDocument = useCallback(
    async (docId: string, pinOrPass: string): Promise<boolean> => {
      const curr = snapshotRef.current;
      if (!curr) return false;
      const doc = curr.documents.find((d) => d.id === docId);
      if (!doc || !doc.isLocked || !doc.encryptedPayload) return false;
      try {
        const raw = await decryptNotePayload(doc.encryptedPayload, pinOrPass);
        const parsed = JSON.parse(raw);
        const updated: DocumentRecord = {
          ...doc,
          isLocked: false,
          encryptedPayload: undefined,
          content: parsed.content,
          htmlCache: parsed.htmlCache,
          plainTextCache: parsed.plainTextCache,
          updatedAt: new Date().toISOString(),
        };
        const restoredDocVersions: DocumentVersion[] = Array.isArray(parsed.versions) ? parsed.versions : [];
        await putInStore('documents', updated);
        if (restoredDocVersions.length > 0) {
          await putManyInStore('versions', restoredDocVersions);
        }
        commitSnapshot((prev) => {
          if (!prev) return prev;
          const versionMap = new Map(restoredDocVersions.map((v) => [v.id, v]));
          return {
            ...prev,
            documents: prev.documents.map((d) => (d.id === docId ? updated : d)),
            versions: prev.versions.map((v) => versionMap.get(v.id) ?? v),
          };
        });
        showToast('Private note unlocked', 'success');
        return true;
      } catch {
        showToast('Incorrect PIN or passphrase', 'error');
        return false;
      }
    },
    [commitSnapshot, showToast]
  );

  const createNotebook = useCallback(
    async (input: { name: string; description?: string; icon: NotebookIconKey; color: CardColorKey }) => {
      const now = new Date().toISOString();
      const nb: Notebook = {
        id: makeId('nb'),
        name: input.name.trim(),
        description: input.description?.trim() ?? '',
        icon: input.icon,
        color: input.color,
        ownerId: snapshotRef.current?.user.id ?? 'user-writer',
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      await putInStore('notebooks', nb);
      commitSnapshot((prev) => (prev ? { ...prev, notebooks: [...prev.notebooks, nb] } : prev));
      return nb;
    },
    [commitSnapshot]
  );

  const updateNotebook = useCallback(
    async (id: string, patch: Partial<Notebook>) => {
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const notebooks = prev.notebooks.map((nb) => {
          if (nb.id !== id) return nb;
          const updated = { ...nb, ...patch, updatedAt: new Date().toISOString() };
          putInStore('notebooks', updated);
          return updated;
        });
        return { ...prev, notebooks };
      });
    },
    [commitSnapshot]
  );

  const archiveNotebook = useCallback(
    async (id: string, archive: boolean) => {
      await updateNotebook(id, { archivedAt: archive ? new Date().toISOString() : null });
      showToast(archive ? 'Notebook archived' : 'Notebook restored', 'success');
    },
    [updateNotebook, showToast]
  );

  const deleteNotebook = useCallback(
    async (id: string) => {
      const curr = snapshotRef.current;
      if (!curr) return;
      const fallbackNb = curr.notebooks.find((n) => n.id !== id && !n.archivedAt) ?? curr.notebooks[0];
      const now = new Date().toISOString();
      await deleteFromStore('notebooks', id);
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const updatedDocs = prev.documents.map((d) => {
          if (d.notebookId !== id) return d;
          const nextDoc =
            fallbackNb && fallbackNb.id !== id
              ? { ...d, notebookId: fallbackNb.id, updatedAt: now }
              : { ...d, deletedAt: now };
          putInStore('documents', nextDoc);
          return nextDoc;
        });
        return {
          ...prev,
          notebooks: prev.notebooks.filter((n) => n.id !== id),
          documents: updatedDocs,
        };
      });
      showToast('Notebook deleted', 'info');
    },
    [commitSnapshot, showToast]
  );

  const createDocument = useCallback(
    async (input?: {
      title?: string;
      notebookId?: string;
      content?: StructuredContent;
      html?: string;
      cardColor?: CardColorKey;
      pageSetup?: PageSetup;
    }) => {
      const curr = snapshotRef.current;
      const now = new Date().toISOString();
      const defaultNotebookId =
        input?.notebookId || curr?.notebooks.find((n) => !n.archivedAt)?.id || 'nb-personal';
      const content = input?.content ?? { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
      const plainTextCache = extractPlainText(content);
      const doc: DocumentRecord = {
        id: makeId('doc'),
        title: input?.title ?? 'Untitled Note',
        notebookId: defaultNotebookId,
        ownerId: curr?.user.id ?? 'user-writer',
        content,
        htmlCache: input?.html ?? '<p></p>',
        plainTextCache,
        documentSchemaVersion: 1,
        pageSetup: input?.pageSetup ?? DEFAULT_PAGE_SETUP,
        cardColor: input?.cardColor ?? 'purple',
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        isLocked: false,
        tagIds: [],
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: isOnline ? 'pending' : 'local',
      };
      const initialVersion: DocumentVersion = {
        id: makeId('ver'),
        documentId: doc.id,
        versionNumber: 1,
        contentSnapshot: doc.content,
        htmlSnapshot: doc.htmlCache,
        titleSnapshot: doc.title,
        versionLabel: 'Initial version',
        createdAt: now,
      };
      await Promise.all([putInStore('documents', doc), putInStore('versions', initialVersion)]);
      commitSnapshot((prev) =>
        prev
          ? {
              ...prev,
              documents: [doc, ...prev.documents],
              versions: [initialVersion, ...prev.versions],
            }
          : prev
      );
      return doc;
    },
    [commitSnapshot, isOnline]
  );

  const saveDocument = useCallback(
    async (
      id: string,
      patch: Partial<DocumentRecord>,
      options?: { createAutoVersion?: boolean }
    ): Promise<DocumentRecord | undefined> => {
      let savedRecord: DocumentRecord | undefined;
      let createdVersion: DocumentVersion | undefined;

      commitSnapshot((prev) => {
        if (!prev) return prev;
        const existing = prev.documents.find((d) => d.id === id);
        if (!existing) return prev;
        const now = new Date().toISOString();
        const nextContent = patch.content ?? existing.content;
        const plainTextCache =
          patch.plainTextCache ?? (patch.content ? extractPlainText(nextContent) : existing.plainTextCache);

        savedRecord = {
          ...existing,
          ...patch,
          content: nextContent,
          plainTextCache,
          updatedAt: now,
          syncStatus: prev.settings.cloudSyncEnabled ? 'pending' : 'local',
        };
        putInStore('documents', savedRecord);

        // Automatic version snapshot at most once every 90s when content meaningfully changes
        const lastAuto = autoVersionTracker.current[id] ?? 0;
        const shouldAutoSnapshot =
          options?.createAutoVersion &&
          prev.settings.editorPreferences.versionHistory &&
          Date.now() - lastAuto > 90_000 &&
          plainTextCache !== existing.plainTextCache;

        if (shouldAutoSnapshot) {
          autoVersionTracker.current[id] = Date.now();
          const docVersions = prev.versions.filter((v) => v.documentId === id);
          const nextNum = docVersions.reduce((m, v) => Math.max(m, v.versionNumber), 0) + 1;
          createdVersion = {
            id: makeId('ver'),
            documentId: id,
            versionNumber: nextNum,
            contentSnapshot: savedRecord.content,
            htmlSnapshot: savedRecord.htmlCache,
            titleSnapshot: savedRecord.title,
            versionLabel: 'Auto-saved snapshot',
            createdAt: now,
          };
          putInStore('versions', createdVersion);
        }

        return {
          ...prev,
          documents: prev.documents.map((d) => (d.id === id ? savedRecord! : d)),
          versions: createdVersion ? [createdVersion, ...prev.versions] : prev.versions,
        };
      });

      return savedRecord;
    },
    [commitSnapshot]
  );

  const duplicateDocument = useCallback(
    async (id: string) => {
      const source = snapshotRef.current?.documents.find((d) => d.id === id);
      if (!source) return undefined;
      const copy = await createDocument({
        title: `${source.title} (Copy)`,
        notebookId: source.notebookId,
        content: JSON.parse(JSON.stringify(source.content)),
        html: source.htmlCache,
        cardColor: source.cardColor,
        pageSetup: JSON.parse(JSON.stringify(source.pageSetup)),
      });
      showToast('Note duplicated', 'success');
      return copy;
    },
    [createDocument, showToast]
  );

  const moveDocument = useCallback(
    async (id: string, targetNotebookId: string) => {
      await saveDocument(id, { notebookId: targetNotebookId });
      showToast('Moved to notebook', 'success');
    },
    [saveDocument, showToast]
  );

  const mergeDocuments = useCallback(
    async (sourceId: string, targetId: string) => {
      const curr = snapshotRef.current;
      if (!curr || sourceId === targetId) return;
      const source = curr.documents.find((d) => d.id === sourceId);
      const target = curr.documents.find((d) => d.id === targetId);
      if (!source || !target) return;

      const mergedContent: StructuredContent = {
        type: 'doc',
        content: [
          ...(target.content.content ?? []),
          { type: 'horizontalRule' },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: source.title }] },
          ...(source.content.content ?? []),
        ],
      };
      const mergedHtml = `${target.htmlCache}<hr/><h2>${source.title}</h2>${source.htmlCache}`;
      await saveDocument(targetId, {
        content: mergedContent,
        htmlCache: mergedHtml,
        plainTextCache: extractPlainText(mergedContent),
      });
      showToast(`Merged "${source.title}" into "${target.title}"`, 'success');
    },
    [saveDocument, showToast]
  );

  const trashDocument = useCallback(
    async (id: string) => {
      await saveDocument(id, { deletedAt: new Date().toISOString(), isPinned: false });
      showToast('Moved to Trash', 'info');
    },
    [saveDocument, showToast]
  );

  const restoreDocument = useCallback(
    async (id: string) => {
      await saveDocument(id, { deletedAt: null });
      showToast('Note restored', 'success');
    },
    [saveDocument, showToast]
  );

  const permanentlyDeleteDocument = useCallback(
    async (id: string) => {
      await deleteFromStore('documents', id);
      commitSnapshot((prev) =>
        prev
          ? {
              ...prev,
              documents: prev.documents.filter((d) => d.id !== id),
              versions: prev.versions.filter((v) => v.documentId !== id),
              comments: prev.comments.filter((c) => c.documentId !== id),
              bookmarks: prev.bookmarks.filter((b) => b.documentId !== id),
            }
          : prev
      );
      showToast('Note permanently deleted', 'info');
    },
    [commitSnapshot, showToast]
  );

  const emptyTrash = useCallback(async () => {
    const curr = snapshotRef.current;
    if (!curr) return;
    const trashed = curr.documents.filter((d) => d.deletedAt);
    await Promise.all(trashed.map((d) => deleteFromStore('documents', d.id)));
    commitSnapshot((prev) =>
      prev ? { ...prev, documents: prev.documents.filter((d) => !d.deletedAt) } : prev
    );
    showToast('Trash emptied', 'info');
  }, [commitSnapshot, showToast]);

  const createManualVersion = useCallback(
    async (docId: string, label: string) => {
      const curr = snapshotRef.current;
      const doc = curr?.documents.find((d) => d.id === docId);
      if (!doc) return undefined;
      const docVersions = curr?.versions.filter((v) => v.documentId === docId) ?? [];
      const nextNum = docVersions.reduce((m, v) => Math.max(m, v.versionNumber), 0) + 1;
      const ver: DocumentVersion = {
        id: makeId('ver'),
        documentId: docId,
        versionNumber: nextNum,
        contentSnapshot: JSON.parse(JSON.stringify(doc.content)),
        htmlSnapshot: doc.htmlCache,
        titleSnapshot: doc.title,
        versionLabel: label.trim() || `Version ${nextNum}`,
        createdAt: new Date().toISOString(),
      };
      await putInStore('versions', ver);
      commitSnapshot((prev) => (prev ? { ...prev, versions: [ver, ...prev.versions] } : prev));
      showToast('Version snapshot saved', 'success');
      return ver;
    },
    [commitSnapshot, showToast]
  );

  const restoreVersion = useCallback(
    async (docId: string, versionId: string) => {
      const curr = snapshotRef.current;
      const doc = curr?.documents.find((d) => d.id === docId);
      const targetVer = curr?.versions.find((v) => v.id === versionId);
      if (!doc || !targetVer) return undefined;

      // Preserve current state first so restoration never destroys previous work
      const docVersions = curr?.versions.filter((v) => v.documentId === docId) ?? [];
      const nextNum = docVersions.reduce((m, v) => Math.max(m, v.versionNumber), 0) + 1;
      const backupVer: DocumentVersion = {
        id: makeId('ver'),
        documentId: docId,
        versionNumber: nextNum,
        contentSnapshot: JSON.parse(JSON.stringify(doc.content)),
        htmlSnapshot: doc.htmlCache,
        titleSnapshot: doc.title,
        versionLabel: `Backup before restoring v${targetVer.versionNumber}`,
        createdAt: new Date().toISOString(),
      };
      await putInStore('versions', backupVer);
      commitSnapshot((prev) => (prev ? { ...prev, versions: [backupVer, ...prev.versions] } : prev));

      const restored = await saveDocument(docId, {
        title: targetVer.titleSnapshot,
        content: JSON.parse(JSON.stringify(targetVer.contentSnapshot)),
        htmlCache: targetVer.htmlSnapshot,
        plainTextCache: extractPlainText(targetVer.contentSnapshot),
      });
      showToast(`Restored "${targetVer.versionLabel}"`, 'success');
      return restored;
    },
    [commitSnapshot, saveDocument, showToast]
  );

  const deleteVersion = useCallback(
    async (versionId: string) => {
      await deleteFromStore('versions', versionId);
      commitSnapshot((prev) =>
        prev ? { ...prev, versions: prev.versions.filter((v) => v.id !== versionId) } : prev
      );
    },
    [commitSnapshot]
  );

  const addComment = useCallback(
    async (docId: string, content: string, anchorText: string) => {
      const curr = snapshotRef.current;
      const now = new Date().toISOString();
      const comment: DocumentComment = {
        id: makeId('cmt'),
        documentId: docId,
        authorId: curr?.user.id ?? 'user-writer',
        authorName: curr?.user.name ?? 'Writer',
        content: content.trim(),
        anchorText: anchorText.trim(),
        resolved: false,
        replies: [],
        createdAt: now,
        updatedAt: now,
      };
      await putInStore('comments', comment);
      commitSnapshot((prev) => (prev ? { ...prev, comments: [comment, ...prev.comments] } : prev));
      return comment;
    },
    [commitSnapshot]
  );

  const replyToComment = useCallback(
    async (commentId: string, replyText: string) => {
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const comments = prev.comments.map((c) => {
          if (c.id !== commentId) return c;
          const updated: DocumentComment = {
            ...c,
            replies: [
              ...c.replies,
              {
                id: makeId('rep'),
                authorName: prev.user.name,
                content: replyText.trim(),
                createdAt: new Date().toISOString(),
              },
            ],
            updatedAt: new Date().toISOString(),
          };
          putInStore('comments', updated);
          return updated;
        });
        return { ...prev, comments };
      });
    },
    [commitSnapshot]
  );

  const toggleResolveComment = useCallback(
    async (commentId: string) => {
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const comments = prev.comments.map((c) => {
          if (c.id !== commentId) return c;
          const updated = { ...c, resolved: !c.resolved, updatedAt: new Date().toISOString() };
          putInStore('comments', updated);
          return updated;
        });
        return { ...prev, comments };
      });
    },
    [commitSnapshot]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      await deleteFromStore('comments', commentId);
      commitSnapshot((prev) =>
        prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) } : prev
      );
    },
    [commitSnapshot]
  );

  const addBookmark = useCallback(
    async (docId: string, name: string, anchorReference: string) => {
      const bm: DocumentBookmark = {
        id: makeId('bm'),
        documentId: docId,
        name: name.trim(),
        anchorReference,
        createdAt: new Date().toISOString(),
      };
      await putInStore('bookmarks', bm);
      commitSnapshot((prev) => (prev ? { ...prev, bookmarks: [bm, ...prev.bookmarks] } : prev));
      return bm;
    },
    [commitSnapshot]
  );

  const renameBookmark = useCallback(
    async (bookmarkId: string, name: string) => {
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const bookmarks = prev.bookmarks.map((b) => {
          if (b.id !== bookmarkId) return b;
          const updated = { ...b, name: name.trim() };
          putInStore('bookmarks', updated);
          return updated;
        });
        return { ...prev, bookmarks };
      });
    },
    [commitSnapshot]
  );

  const deleteBookmark = useCallback(
    async (bookmarkId: string) => {
      await deleteFromStore('bookmarks', bookmarkId);
      commitSnapshot((prev) =>
        prev ? { ...prev, bookmarks: prev.bookmarks.filter((b) => b.id !== bookmarkId) } : prev
      );
    },
    [commitSnapshot]
  );

  const createTag = useCallback(
    async (name: string, color: CardColorKey) => {
      const tag: Tag = { id: makeId('tag'), name: name.trim(), color };
      await putInStore('tags', tag);
      commitSnapshot((prev) => (prev ? { ...prev, tags: [...prev.tags, tag] } : prev));
      return tag;
    },
    [commitSnapshot]
  );

  const renameTag = useCallback(
    async (tagId: string, name: string) => {
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const tags = prev.tags.map((t) => {
          if (t.id !== tagId) return t;
          const updated = { ...t, name: name.trim() };
          putInStore('tags', updated);
          return updated;
        });
        return { ...prev, tags };
      });
    },
    [commitSnapshot]
  );

  const deleteTag = useCallback(
    async (tagId: string) => {
      await deleteFromStore('tags', tagId);
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const docs = prev.documents.map((d) => {
          if (!d.tagIds.includes(tagId)) return d;
          const updated = { ...d, tagIds: d.tagIds.filter((tid) => tid !== tagId) };
          putInStore('documents', updated);
          return updated;
        });
        return { ...prev, tags: prev.tags.filter((t) => t.id !== tagId), documents: docs };
      });
    },
    [commitSnapshot]
  );

  const toggleDocumentTag = useCallback(
    async (docId: string, tagId: string) => {
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const documents = prev.documents.map((d) => {
          if (d.id !== docId) return d;
          const has = d.tagIds.includes(tagId);
          const updated = {
            ...d,
            tagIds: has ? d.tagIds.filter((id) => id !== tagId) : [...d.tagIds, tagId],
            updatedAt: new Date().toISOString(),
          };
          putInStore('documents', updated);
          return updated;
        });
        return { ...prev, documents };
      });
    },
    [commitSnapshot]
  );

  const recordMediaAsset = useCallback(
    async (asset: Omit<MediaAsset, 'id' | 'createdAt'>) => {
      const full: MediaAsset = {
        ...asset,
        id: makeId('media'),
        createdAt: new Date().toISOString(),
      };
      await putInStore('media', full);
      commitSnapshot((prev) => (prev ? { ...prev, media: [full, ...prev.media] } : prev));
      return full;
    },
    [commitSnapshot]
  );

  const createCustomTemplate = useCallback(
    async (docId: string, name: string, category: string) => {
      const doc = snapshotRef.current?.documents.find((d) => d.id === docId);
      if (!doc) return undefined;
      const tpl: DocumentTemplate = {
        id: makeId('tpl'),
        name: name.trim() || `${doc.title} Template`,
        category: category.trim() || 'Custom',
        description: 'Custom saved document template',
        icon: 'file',
        color: doc.cardColor,
        isCustom: true,
        content: JSON.parse(JSON.stringify(doc.content)),
        htmlContent: doc.htmlCache,
        createdAt: new Date().toISOString(),
      };
      await putInStore('templates', tpl);
      commitSnapshot((prev) => (prev ? { ...prev, templates: [tpl, ...prev.templates] } : prev));
      showToast('Template created', 'success');
      return tpl;
    },
    [commitSnapshot, showToast]
  );

  const updateTemplate = useCallback(
    async (id: string, patch: Partial<DocumentTemplate>) => {
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const templates = prev.templates.map((t) => {
          if (t.id !== id) return t;
          const updated = { ...t, ...patch };
          putInStore('templates', updated);
          return updated;
        });
        return { ...prev, templates };
      });
    },
    [commitSnapshot]
  );

  const duplicateTemplate = useCallback(
    async (id: string) => {
      const src = snapshotRef.current?.templates.find((t) => t.id === id);
      if (!src) return undefined;
      const copy: DocumentTemplate = {
        ...src,
        id: makeId('tpl'),
        name: `${src.name} (Copy)`,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      await putInStore('templates', copy);
      commitSnapshot((prev) => (prev ? { ...prev, templates: [copy, ...prev.templates] } : prev));
      showToast('Template duplicated', 'success');
      return copy;
    },
    [commitSnapshot, showToast]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await deleteFromStore('templates', id);
      commitSnapshot((prev) =>
        prev ? { ...prev, templates: prev.templates.filter((t) => t.id !== id) } : prev
      );
      showToast('Template deleted', 'info');
    },
    [commitSnapshot, showToast]
  );

  const recordSearchQuery = useCallback(
    async (q: string) => {
      const clean = q.trim();
      if (!clean) return;
      commitSnapshot((prev) => {
        if (!prev) return prev;
        const next = [clean, ...prev.recentSearches.filter((s) => s !== clean)].slice(0, 8);
        putInStore('meta', { id: 'recentSearches', values: next });
        return { ...prev, recentSearches: next };
      });
    },
    [commitSnapshot]
  );

  const clearTemporaryData = useCallback(async () => {
    await clearStore('meta');
    await putInStore('meta', { id: 'recentSearches', values: [] });
    commitSnapshot((prev) => (prev ? { ...prev, recentSearches: [] } : prev));
    showToast('Temporary cache & search history cleared', 'success');
  }, [commitSnapshot, showToast]);

  const exportWorkspaceBackup = useCallback(() => {
    const curr = snapshotRef.current;
    if (!curr) return '';
    return buildBackupJson(curr);
  }, []);

  const importWorkspaceBackup = useCallback(
    async (rawJson: string) => {
      const restored = await restoreBackupJson(rawJson);
      commitSnapshot(() => restored);
      showToast('Workspace backup restored', 'success');
    },
    [commitSnapshot, showToast]
  );

  const syncPushToCloud = useCallback(async (): Promise<boolean> => {
    const curr = snapshotRef.current;
    if (!curr) return false;
    try {
      const syncKey = await getOrCreateDeviceSyncSecret();
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Notely-Sync-Key': syncKey,
        },
        body: JSON.stringify({ workspaceId: curr.user.id, payload: curr }),
      });
      if (!res.ok) throw new Error('Sync push failed');
      const data = await res.json();
      await updateSettings((s) => ({
        ...s,
        cloudSyncEnabled: true,
        lastSyncedAt: data.updatedAt,
      }));
      commitSnapshot((prev) =>
        prev
          ? {
              ...prev,
              documents: prev.documents.map((d) => {
                const updated = { ...d, syncStatus: 'synced' as const };
                putInStore('documents', updated);
                return updated;
              }),
            }
          : prev
      );
      showToast('Synced workspace to cloud', 'success');
      return true;
    } catch {
      showToast('Cloud sync unavailable while offline', 'error');
      return false;
    }
  }, [commitSnapshot, updateSettings, showToast]);

  // Automatically flush pending sync edits when connectivity returns online
  useEffect(() => {
    if (!isOnline || !snapshotRef.current?.settings.cloudSyncEnabled) return;
    const hasPending = snapshotRef.current.documents.some((d) => d.syncStatus === 'pending');
    if (hasPending) {
      void syncPushToCloud();
    }
  }, [isOnline, syncPushToCloud]);

  const syncPullFromCloud = useCallback(async (): Promise<boolean> => {
    const curr = snapshotRef.current;
    if (!curr) return false;
    try {
      const syncKey = await getOrCreateDeviceSyncSecret();
      const res = await fetch(`/api/sync/pull?workspaceId=${encodeURIComponent(curr.user.id)}`, {
        headers: { 'X-Notely-Sync-Key': syncKey },
      });
      if (!res.ok) throw new Error('No cloud snapshot found');
      const data = await res.json();
      if (data.payload) {
        const restored = await restoreBackupJson(
          JSON.stringify({ schema: 'notely-backup-v1', exportedAt: data.updatedAt, data: data.payload })
        );
        snapshotRef.current = restored;
        setSnapshot(restored);
        showToast('Pulled latest workspace from cloud', 'success');
        return true;
      }
      return false;
    } catch {
      showToast('No cloud backup available to pull', 'error');
      return false;
    }
  }, [showToast]);

  const createDocumentShare = useCallback(
    async (docId: string, permission: 'view' | 'edit', expiresHours?: number) => {
      const doc = snapshotRef.current?.documents.find((d) => d.id === docId);
      if (!doc) return undefined;
      const shareToken = makeId('share');
      const expiresAt = expiresHours
        ? new Date(Date.now() + expiresHours * 3600 * 1000).toISOString()
        : null;
      const share: DocumentShare = {
        id: makeId('sh'),
        documentId: docId,
        permission,
        isPublic: true,
        shareToken,
        expiresAt,
        revoked: false,
        createdAt: new Date().toISOString(),
      };
      try {
        const ownerKey = await getOrCreateDeviceSyncSecret();
        await fetch('/api/shares', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Notely-Owner-Key': ownerKey,
          },
          body: JSON.stringify({
            token: shareToken,
            documentId: doc.id,
            title: doc.title,
            html: doc.htmlCache,
            content: doc.content,
            permission,
            isPublic: true,
            expiresAt,
          }),
        });
      } catch {
        // Still persist locally if offline
      }
      await putInStore('shares', share);
      commitSnapshot((prev) => (prev ? { ...prev, shares: [share, ...prev.shares] } : prev));
      showToast('Shareable link created', 'success');
      return share;
    },
    [commitSnapshot, showToast]
  );

  const revokeDocumentShare = useCallback(
    async (shareId: string, token: string) => {
      try {
        const ownerKey = await getOrCreateDeviceSyncSecret();
        await fetch(`/api/shares/${encodeURIComponent(token)}/revoke`, {
          method: 'POST',
          headers: { 'X-Notely-Owner-Key': ownerKey },
        });
      } catch {
        // Offline graceful handling
      }
      await deleteFromStore('shares', shareId);
      commitSnapshot((prev) =>
        prev ? { ...prev, shares: prev.shares.filter((s) => s.id !== shareId) } : prev
      );
      showToast('Share access revoked', 'info');
    },
    [commitSnapshot, showToast]
  );

  const storageBreakdown = useMemo(
    () =>
      snapshot
        ? calculateStorageBreakdown(snapshot)
        : { documentsBytes: 0, mediaBytes: 0, otherBytes: 0, totalBytes: 0 },
    [snapshot]
  );

  const value: NotelyContextValue = {
    ready,
    isOnline,
    isAppLocked,
    route,
    navigate,
    goBack,
    user: snapshot?.user ?? {
      id: 'user-writer',
      name: 'Writer',
      email: '',
      avatar: 'W',
      workspaceName: 'Personal workspace',
      workspaceDescription: 'stored on this device',
      createdAt: '',
      updatedAt: '',
    },
    settings: snapshot?.settings ?? {
      id: 'settings-default',
      userId: 'user-writer',
      theme: 'light',
      accentColor: 'purple',
      editorPreferences: {
        spellingAndGrammar: true,
        autoSave: true,
        versionHistory: true,
        defaultFont: 'Plus Jakarta Sans',
        defaultFontSize: 16,
        defaultTextStyle: 'paragraph',
        defaultParagraphSpacing: 12,
        defaultLineSpacing: 1.6,
        autoFormatting: true,
      },
      securityPreferences: {
        appLockEnabled: false,
        pinHash: null,
        biometricEnabled: false,
        lockedDocumentIds: [],
        lockedNotebookIds: [],
      },
      cloudSyncEnabled: false,
      lastSyncedAt: null,
    },
    notebooks: snapshot?.notebooks ?? [],
    documents: snapshot?.documents ?? [],
    versions: snapshot?.versions ?? [],
    tags: snapshot?.tags ?? [],
    comments: snapshot?.comments ?? [],
    bookmarks: snapshot?.bookmarks ?? [],
    media: snapshot?.media ?? [],
    shares: snapshot?.shares ?? [],
    templates: snapshot?.templates ?? [],
    recentSearches: snapshot?.recentSearches ?? [],
    toasts,
    storageBreakdown,
    showToast,
    dismissToast,
    setTheme,
    setAccentColor,
    updateUserProfile,
    updateEditorPreferences,
    setupOrChangePin,
    toggleAppLock,
    toggleBiometric,
    verifyPinAndUnlockApp,
    verifyBiometricAndUnlockApp,
    lockAppNow,
    toggleDocumentLock,
    unlockPrivateDocument,
    createNotebook,
    updateNotebook,
    archiveNotebook,
    deleteNotebook,
    createDocument,
    saveDocument,
    duplicateDocument,
    moveDocument,
    mergeDocuments,
    trashDocument,
    restoreDocument,
    permanentlyDeleteDocument,
    emptyTrash,
    createManualVersion,
    restoreVersion,
    deleteVersion,
    addComment,
    replyToComment,
    toggleResolveComment,
    deleteComment,
    addBookmark,
    renameBookmark,
    deleteBookmark,
    createTag,
    renameTag,
    deleteTag,
    toggleDocumentTag,
    recordMediaAsset,
    createCustomTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
    recordSearchQuery,
    clearTemporaryData,
    exportWorkspaceBackup,
    importWorkspaceBackup,
    syncPushToCloud,
    syncPullFromCloud,
    createDocumentShare,
    revokeDocumentShare,
  };

  return <NotelyContext.Provider value={value}>{children}</NotelyContext.Provider>;
}

export function useNotely(): NotelyContextValue {
  const ctx = useContext(NotelyContext);
  if (!ctx) {
    throw new Error('useNotely must be used within a NotelyProvider');
  }
  return ctx;
}
