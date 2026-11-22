import {
  DEFAULT_EDITOR_PREFS,
  DEFAULT_PAGE_SETUP,
  type DocumentBookmark,
  type DocumentComment,
  type DocumentRecord,
  type DocumentShare,
  type DocumentTemplate,
  type DocumentVersion,
  type MediaAsset,
  type Notebook,
  type Tag,
  type UserProfile,
  type UserSettings,
} from '../types/notely';
import { BUILT_IN_TEMPLATES } from '../data/templates';

const DB_NAME = 'notely_offline_db';
const DB_VERSION = 1;

export const STORE_NAMES = [
  'users',
  'notebooks',
  'documents',
  'versions',
  'tags',
  'comments',
  'bookmarks',
  'media',
  'shares',
  'settings',
  'templates',
  'meta',
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIdFromStore<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function putInStore<T extends { id: string }>(storeName: StoreName, record: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putManyInStore<T extends { id: string }>(
  storeName: StoreName,
  records: T[]
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const r of records) {
      store.put(r);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: StoreName, id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function createInitialSeedData() {
  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 6).toISOString();
  const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgoIso = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgoIso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const user: UserProfile = {
    id: 'user-writer',
    name: 'Writer',
    email: 'writer@notely.local',
    avatar: 'W',
    workspaceName: 'Personal workspace',
    workspaceDescription: 'stored on this device',
    createdAt: threeDaysAgoIso,
    updatedAt: todayIso,
  };

  const settings: UserSettings = {
    id: 'settings-default',
    userId: user.id,
    theme: 'light',
    accentColor: 'purple',
    editorPreferences: DEFAULT_EDITOR_PREFS,
    securityPreferences: {
      appLockEnabled: false,
      pinHash: null,
      biometricEnabled: false,
      lockedDocumentIds: [],
      lockedNotebookIds: [],
    },
    cloudSyncEnabled: false,
    lastSyncedAt: null,
  };

  const notebooks: Notebook[] = [
    {
      id: 'nb-personal',
      name: 'Personal',
      description: 'Reflections, journals, and everyday thoughts',
      icon: 'book',
      color: 'purple',
      ownerId: user.id,
      createdAt: threeDaysAgoIso,
      updatedAt: todayIso,
      archivedAt: null,
    },
    {
      id: 'nb-work',
      name: 'Work',
      description: 'Product roadmaps, design syncs, and project specs',
      icon: 'briefcase',
      color: 'blue',
      ownerId: user.id,
      createdAt: threeDaysAgoIso,
      updatedAt: yesterdayIso,
      archivedAt: null,
    },
    {
      id: 'nb-ideas',
      name: 'Ideas',
      description: 'Sketches, concepts, and creative sparks',
      icon: 'lightbulb',
      color: 'yellow',
      ownerId: user.id,
      createdAt: threeDaysAgoIso,
      updatedAt: twoDaysAgoIso,
      archivedAt: null,
    },
    {
      id: 'nb-study',
      name: 'Study',
      description: 'Research notes, equations, and study guides',
      icon: 'graduation',
      color: 'green',
      ownerId: user.id,
      createdAt: threeDaysAgoIso,
      updatedAt: threeDaysAgoIso,
      archivedAt: null,
    },
  ];

  const tags: Tag[] = [
    { id: 'tag-roadmap', name: 'Roadmap', color: 'blue' },
    { id: 'tag-design', name: 'Design', color: 'purple' },
    { id: 'tag-journal', name: 'Journal', color: 'pink' },
    { id: 'tag-study', name: 'Research', color: 'green' },
  ];

  const documents: DocumentRecord[] = [
    {
      id: 'doc-welcome',
      title: 'Welcome to Notely',
      notebookId: 'nb-personal',
      ownerId: user.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'A premium space for your thinking — rich documents, sketches, tables and charts, all in one offline-first workspace.',
              },
            ],
          },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What you can build' }] },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write structured long-form documents with headings & tables' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Insert freehand drawings, interactive charts, and equations' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export cleanly to PDF, DOCX, ODT, RTF, HTML, and Markdown' }] }],
              },
            ],
          },
        ],
      },
      htmlCache:
        '<p>A premium space for your thinking — rich documents, sketches, tables and charts, all in one offline-first workspace.</p><h2>What you can build</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Write structured long-form documents with headings &amp; tables</p></li><li data-type="taskItem" data-checked="false"><p>Insert freehand drawings, interactive charts, and equations</p></li><li data-type="taskItem" data-checked="false"><p>Export cleanly to PDF, DOCX, ODT, RTF, HTML, and Markdown</p></li></ul>',
      plainTextCache:
        'A premium space for your thinking - rich documents, sketches, tables and charts, all in one offline-first workspace.',
      documentSchemaVersion: 1,
      pageSetup: DEFAULT_PAGE_SETUP,
      cardColor: 'purple',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      isLocked: false,
      tagIds: ['tag-design'],
      createdAt: threeDaysAgoIso,
      updatedAt: todayIso,
      deletedAt: null,
      syncStatus: 'local',
    },
    {
      id: 'doc-roadmap',
      title: 'Q4 Product Roadmap',
      notebookId: 'nb-work',
      ownerId: user.id,
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Objectives' }] },
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ship the new editor experience' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Grow weekly active writers by 20%' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Launch premium export formats (PDF, DOCX, ODT)' }] }] },
            ],
          },
        ],
      },
      htmlCache:
        '<h2>Objectives</h2><ul><li><p>Ship the new editor experience</p></li><li><p>Grow weekly active writers by 20%</p></li><li><p>Launch premium export formats (PDF, DOCX, ODT)</p></li></ul>',
      plainTextCache:
        'Objectives Ship the new editor experience Grow weekly active writers by 20% Launch premium export formats (PDF, DOCX, ODT)',
      documentSchemaVersion: 1,
      pageSetup: DEFAULT_PAGE_SETUP,
      cardColor: 'blue',
      isPinned: true,
      isFavorite: false,
      isArchived: false,
      isLocked: false,
      tagIds: ['tag-roadmap'],
      createdAt: twoDaysAgoIso,
      updatedAt: yesterdayIso,
      deletedAt: null,
      syncStatus: 'local',
    },
    {
      id: 'doc-sunday',
      title: 'Sunday reset',
      notebookId: 'nb-personal',
      ownerId: user.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Slow morning. Coffee, a long walk, then an hour of planning the week ahead. Grateful for quiet focus time.',
              },
            ],
          },
        ],
      },
      htmlCache:
        '<p>Slow morning. Coffee, a long walk, then an hour of planning the week ahead. Grateful for quiet focus time.</p>',
      plainTextCache:
        'Slow morning. Coffee, a long walk, then an hour of planning the week ahead. Grateful for quiet focus time.',
      documentSchemaVersion: 1,
      pageSetup: DEFAULT_PAGE_SETUP,
      cardColor: 'pink',
      isPinned: false,
      isFavorite: true,
      isArchived: false,
      isLocked: false,
      tagIds: ['tag-journal'],
      createdAt: twoDaysAgoIso,
      updatedAt: yesterdayIso,
      deletedAt: null,
      syncStatus: 'local',
    },
    {
      id: 'doc-design-sync',
      title: 'Design Sync - Nov 18',
      notebookId: 'nb-work',
      ownerId: user.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Attendees: Maya, Devon, Priya, Sam' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Decisions: Cards get a 24px radius and a soft colored accent strip on top for quick visual scanning.',
              },
            ],
          },
        ],
      },
      htmlCache:
        '<p>Attendees: Maya, Devon, Priya, Sam</p><p>Decisions: Cards get a 24px radius and a soft colored accent strip on top for quick visual scanning.</p>',
      plainTextCache:
        'Attendees: Maya, Devon, Priya, Sam Decisions: Cards get a 24px radius and a soft colored accent strip on top for quick visual scanning.',
      documentSchemaVersion: 1,
      pageSetup: DEFAULT_PAGE_SETUP,
      cardColor: 'green',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      isLocked: false,
      tagIds: ['tag-design'],
      createdAt: threeDaysAgoIso,
      updatedAt: twoDaysAgoIso,
      deletedAt: null,
      syncStatus: 'local',
    },
    {
      id: 'doc-ideas-sketch',
      title: 'Voice-to-Structure Concept',
      notebookId: 'nb-ideas',
      ownerId: user.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Capture fleeting voice memos offline and convert them cleanly into structured headings, checklists, and tables.',
              },
            ],
          },
        ],
      },
      htmlCache:
        '<p>Capture fleeting voice memos offline and convert them cleanly into structured headings, checklists, and tables.</p>',
      plainTextCache:
        'Capture fleeting voice memos offline and convert them cleanly into structured headings, checklists, and tables.',
      documentSchemaVersion: 1,
      pageSetup: DEFAULT_PAGE_SETUP,
      cardColor: 'yellow',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      isLocked: false,
      tagIds: [],
      createdAt: threeDaysAgoIso,
      updatedAt: twoDaysAgoIso,
      deletedAt: null,
      syncStatus: 'local',
    },
    {
      id: 'doc-study-calculus',
      title: 'Linear Algebra & Eigenvalues',
      notebookId: 'nb-study',
      ownerId: user.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Characteristic equation: det(A - λI) = 0. Eigenvectors span invariant subspaces under linear transformations.',
              },
            ],
          },
        ],
      },
      htmlCache:
        '<p>Characteristic equation: det(A - λI) = 0. Eigenvectors span invariant subspaces under linear transformations.</p>',
      plainTextCache:
        'Characteristic equation: det(A - λI) = 0. Eigenvectors span invariant subspaces under linear transformations.',
      documentSchemaVersion: 1,
      pageSetup: DEFAULT_PAGE_SETUP,
      cardColor: 'teal',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      isLocked: false,
      tagIds: ['tag-study'],
      createdAt: threeDaysAgoIso,
      updatedAt: threeDaysAgoIso,
      deletedAt: null,
      syncStatus: 'local',
    },
  ];

  const versions: DocumentVersion[] = documents.map((d) => ({
    id: `ver-${d.id}-1`,
    documentId: d.id,
    versionNumber: 1,
    contentSnapshot: d.content,
    htmlSnapshot: d.htmlCache,
    titleSnapshot: d.title,
    versionLabel: 'Initial version',
    createdAt: d.createdAt,
  }));

  return { user, settings, notebooks, tags, documents, versions };
}

export interface NotelyDatabaseSnapshot {
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
}

export async function initializeAndLoadDatabase(): Promise<NotelyDatabaseSnapshot> {
  const existingUsers = await getAllFromStore<UserProfile>('users');
  if (existingUsers.length === 0) {
    const seed = createInitialSeedData();
    await Promise.all([
      putInStore('users', seed.user),
      putInStore('settings', seed.settings),
      putManyInStore('notebooks', seed.notebooks),
      putManyInStore('tags', seed.tags),
      putManyInStore('documents', seed.documents),
      putManyInStore('versions', seed.versions),
      putManyInStore('templates', BUILT_IN_TEMPLATES),
      putInStore('meta', { id: 'recentSearches', values: [] }),
    ]);
  } else {
    // Ensure built-in templates exist
    const existingTemplates = await getAllFromStore<DocumentTemplate>('templates');
    if (existingTemplates.length === 0) {
      await putManyInStore('templates', BUILT_IN_TEMPLATES);
    }
  }

  const [
    users,
    settingsList,
    notebooks,
    documents,
    versions,
    tags,
    comments,
    bookmarks,
    media,
    shares,
    templates,
    searchMeta,
  ] = await Promise.all([
    getAllFromStore<UserProfile>('users'),
    getAllFromStore<UserSettings>('settings'),
    getAllFromStore<Notebook>('notebooks'),
    getAllFromStore<DocumentRecord>('documents'),
    getAllFromStore<DocumentVersion>('versions'),
    getAllFromStore<Tag>('tags'),
    getAllFromStore<DocumentComment>('comments'),
    getAllFromStore<DocumentBookmark>('bookmarks'),
    getAllFromStore<MediaAsset>('media'),
    getAllFromStore<DocumentShare>('shares'),
    getAllFromStore<DocumentTemplate>('templates'),
    getByIdFromStore<{ id: string; values: string[] }>('meta', 'recentSearches'),
  ]);

  const canonicalOrder = ['nb-personal', 'nb-work', 'nb-ideas', 'nb-study'];
  const sortedNotebooks = [...notebooks].sort((a, b) => {
    const ia = canonicalOrder.indexOf(a.id);
    const ib = canonicalOrder.indexOf(b.id);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return {
    user: users[0],
    settings: settingsList[0],
    notebooks: sortedNotebooks,
    documents,
    versions,
    tags,
    comments,
    bookmarks,
    media,
    shares,
    templates,
    recentSearches: searchMeta?.values ?? [],
  };
}

/**
 * Estimates real IndexedDB storage usage by category in bytes.
 */
export function calculateStorageBreakdown(snapshot: NotelyDatabaseSnapshot) {
  const encoder = new TextEncoder();
  const docsBytes = encoder.encode(JSON.stringify(snapshot.documents)).length;
  const versionsBytes = encoder.encode(JSON.stringify(snapshot.versions)).length;
  const mediaBytes = snapshot.media.reduce((sum, m) => sum + (m.sizeBytes || m.localPath.length), 0);
  const metaBytes = encoder.encode(
    JSON.stringify({
      notebooks: snapshot.notebooks,
      comments: snapshot.comments,
      bookmarks: snapshot.bookmarks,
      templates: snapshot.templates,
      tags: snapshot.tags,
    })
  ).length;
  return {
    documentsBytes: docsBytes + versionsBytes,
    mediaBytes,
    otherBytes: metaBytes,
    totalBytes: docsBytes + versionsBytes + mediaBytes + metaBytes,
  };
}

/**
 * Exports full encrypted-safe workspace JSON backup.
 */
export function buildBackupJson(snapshot: NotelyDatabaseSnapshot): string {
  return JSON.stringify(
    {
      schema: 'notely-backup-v1',
      exportedAt: new Date().toISOString(),
      data: snapshot,
    },
    null,
    2
  );
}

/**
 * Restores full workspace from backup JSON into IndexedDB.
 */
export async function restoreBackupJson(rawJson: string): Promise<NotelyDatabaseSnapshot> {
  const parsed = JSON.parse(rawJson);
  if (!parsed || parsed.schema !== 'notely-backup-v1' || !parsed.data) {
    throw new Error('Invalid Notely backup file.');
  }
  const data = parsed.data as NotelyDatabaseSnapshot;
  await Promise.all(STORE_NAMES.map((s) => clearStore(s)));
  await Promise.all([
    putInStore('users', data.user),
    putInStore('settings', data.settings),
    putManyInStore('notebooks', data.notebooks ?? []),
    putManyInStore('documents', data.documents ?? []),
    putManyInStore('versions', data.versions ?? []),
    putManyInStore('tags', data.tags ?? []),
    putManyInStore('comments', data.comments ?? []),
    putManyInStore('bookmarks', data.bookmarks ?? []),
    putManyInStore('media', data.media ?? []),
    putManyInStore('shares', data.shares ?? []),
    putManyInStore('templates', data.templates?.length ? data.templates : BUILT_IN_TEMPLATES),
    putInStore('meta', { id: 'recentSearches', values: data.recentSearches ?? [] }),
  ]);
  return initializeAndLoadDatabase();
}

function uint8ToBase64(arr: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  let binary = '';
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    const slice = arr.subarray(i, Math.min(i + CHUNK_SIZE, arr.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function getOrCreateDeviceSyncSecret(): Promise<string> {
  const existing = await getByIdFromStore<{ id: string; secret: string }>('meta', 'deviceSyncSecret');
  if (existing?.secret) return existing.secret;
  const rnd = new Uint8Array(32);
  crypto.getRandomValues(rnd);
  const secret = Array.from(rnd)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await putInStore('meta', { id: 'deviceSyncSecret', secret });
  return secret;
}

/**
 * Real AES-GCM client-side encryption for Private Locked Notes using WebCrypto PBKDF2.
 */
export async function encryptNotePayload(plaintextJson: string, secretPinOrKey: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretPinOrKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 60000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(plaintextJson)
  );
  return JSON.stringify({
    v: 1,
    salt: uint8ToBase64(salt),
    iv: uint8ToBase64(iv),
    ct: uint8ToBase64(new Uint8Array(ciphertext)),
  });
}

export async function decryptNotePayload(encryptedJson: string, secretPinOrKey: string): Promise<string> {
  const parsed = JSON.parse(encryptedJson);
  const salt = base64ToUint8(parsed.salt);
  const iv = base64ToUint8(parsed.iv);
  const ct = base64ToUint8(parsed.ct);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretPinOrKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 60000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
  return new TextDecoder().decode(decrypted);
}
