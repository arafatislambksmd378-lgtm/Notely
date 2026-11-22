import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '.notely-cloud-store.json');

interface CloudStore {
  backups: Record<string, { updatedAt: string; syncKeyHash?: string; payload: unknown }>;
  shares: Record<
    string,
    {
      token: string;
      documentId: string;
      title: string;
      html: string;
      content: unknown;
      permission: 'view' | 'edit';
      isPublic: boolean;
      expiresAt: string | null;
      revoked: boolean;
      ownerKeyHash?: string;
      updatedAt: string;
      activeEditors: Array<{ name: string; lastSeen: string }>;
    }
  >;
}

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function sanitizeServerHtml(raw: string): string {
  return String(raw || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<(object|embed|style|link|meta|base)\b[^>]*>([\s\S]*?<\/\1>)?/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '$1="#"');
}

function loadStore(): CloudStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as CloudStore;
    }
  } catch {
    // Fallback to empty store on parse error
  }
  return { backups: {}, shares: {} };
}

function saveStore(store: CloudStore) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Ignore disk write issues in read-only environments
  }
}

const collabClients = new Map<string, Set<express.Response>>();

function broadcastCollab(token: string, event: string, data: unknown) {
  const clients = collabClients.get(token);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'notely', timestamp: new Date().toISOString() });
  });

  // Cloud Sync & Backup Endpoints (authenticated with per-device/workspace sync key)
  app.post('/api/sync/push', (req, res) => {
    const { workspaceId = 'default', payload } = req.body ?? {};
    const syncKey = String(req.header('X-Notely-Sync-Key') || '');
    if (!payload) {
      res.status(400).json({ error: 'Missing sync payload' });
      return;
    }
    if (!syncKey || syncKey.length < 16) {
      res.status(401).json({ error: 'Missing or invalid workspace sync key' });
      return;
    }
    const wsId = String(workspaceId).slice(0, 80);
    const store = loadStore();
    const existing = store.backups[wsId];
    const incomingHash = hashSecret(syncKey);
    if (existing?.syncKeyHash && !timingSafeMatch(existing.syncKeyHash, incomingHash)) {
      res.status(403).json({ error: 'Workspace sync key mismatch' });
      return;
    }
    const updatedAt = new Date().toISOString();
    store.backups[wsId] = { updatedAt, syncKeyHash: incomingHash, payload };
    saveStore(store);
    res.json({ ok: true, workspaceId: wsId, updatedAt });
  });

  app.get('/api/sync/pull', (req, res) => {
    const workspaceId = String(req.query.workspaceId || 'default').slice(0, 80);
    const syncKey = String(req.header('X-Notely-Sync-Key') || '');
    const store = loadStore();
    const entry = store.backups[workspaceId];
    if (!entry) {
      res.status(404).json({ error: 'No cloud backup found for this workspace' });
      return;
    }
    if (!syncKey || (entry.syncKeyHash && !timingSafeMatch(entry.syncKeyHash, hashSecret(syncKey)))) {
      res.status(403).json({ error: 'Unauthorized cloud sync pull' });
      return;
    }
    res.json({ ok: true, workspaceId, updatedAt: entry.updatedAt, payload: entry.payload });
  });

  // Shareable Document Links & Real-Time Collaboration
  app.post('/api/shares', (req, res) => {
    const { token, documentId, title, html, content, permission = 'view', isPublic = true, expiresAt = null } =
      req.body ?? {};
    const ownerKey = String(req.header('X-Notely-Owner-Key') || '');
    if (!token || !documentId || !/^[a-zA-Z0-9_-]{6,64}$/.test(String(token))) {
      res.status(400).json({ error: 'Valid token and documentId are required' });
      return;
    }
    if (permission !== 'view' && permission !== 'edit') {
      res.status(400).json({ error: 'Invalid share permission' });
      return;
    }
    if (!ownerKey || ownerKey.length < 16) {
      res.status(401).json({ error: 'Missing owner authorization key' });
      return;
    }
    const store = loadStore();
    const updatedAt = new Date().toISOString();
    const safeHtml = sanitizeServerHtml(String(html || '<p></p>'));
    store.shares[token] = {
      token,
      documentId: String(documentId),
      title: String(title || 'Shared Note').slice(0, 200),
      html: safeHtml,
      content: content || { type: 'doc', content: [] },
      permission,
      isPublic: Boolean(isPublic),
      expiresAt: expiresAt ? String(expiresAt) : null,
      revoked: false,
      ownerKeyHash: hashSecret(ownerKey),
      updatedAt,
      activeEditors: [],
    };
    saveStore(store);
    const { ownerKeyHash: _omit, ...publicShare } = store.shares[token];
    res.json({ ok: true, share: publicShare });
  });

  app.get('/api/shares/:token', (req, res) => {
    const store = loadStore();
    const share = store.shares[req.params.token];
    if (!share || share.revoked) {
      res.status(404).json({ error: 'Shared document not found or access revoked' });
      return;
    }
    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
      res.status(410).json({ error: 'Share link has expired' });
      return;
    }
    const { ownerKeyHash: _omit, ...publicShare } = share;
    res.json({ ok: true, share: publicShare });
  });

  app.post('/api/shares/:token/revoke', (req, res) => {
    const ownerKey = String(req.header('X-Notely-Owner-Key') || '');
    const store = loadStore();
    const share = store.shares[req.params.token];
    if (!share) {
      res.status(404).json({ error: 'Share link not found' });
      return;
    }
    if (share.ownerKeyHash && (!ownerKey || !timingSafeMatch(share.ownerKeyHash, hashSecret(ownerKey)))) {
      res.status(403).json({ error: 'Only the share owner can revoke this link' });
      return;
    }
    share.revoked = true;
    saveStore(store);
    broadcastCollab(req.params.token, 'revoked', { token: req.params.token });
    res.json({ ok: true });
  });

  app.get('/api/collab/:token/events', (req, res) => {
    const token = req.params.token;
    const store = loadStore();
    const share = store.shares[token];
    if (!share || share.revoked) {
      res.status(404).json({ error: 'Share not active' });
      return;
    }
    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
      res.status(410).json({ error: 'Share link has expired' });
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!collabClients.has(token)) {
      collabClients.set(token, new Set());
    }
    collabClients.get(token)!.add(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ token })}\n\n`);

    req.on('close', () => {
      collabClients.get(token)?.delete(res);
    });
  });

  app.post('/api/collab/:token/update', (req, res) => {
    const token = req.params.token;
    const { title, html, content, authorName = 'Collaborator' } = req.body ?? {};
    const store = loadStore();
    const share = store.shares[token];
    if (!share || share.revoked) {
      res.status(404).json({ error: 'Share not active' });
      return;
    }
    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
      res.status(410).json({ error: 'Share link has expired' });
      return;
    }
    if (share.permission !== 'edit') {
      res.status(403).json({ error: 'Read-only share link' });
      return;
    }
    if (typeof title === 'string') share.title = title.slice(0, 200);
    if (typeof html === 'string') share.html = sanitizeServerHtml(html);
    if (content !== undefined) share.content = content;
    share.updatedAt = new Date().toISOString();
    const safeAuthor = String(authorName || 'Collaborator').slice(0, 48);
    const editors = share.activeEditors.filter((e) => e.name !== safeAuthor);
    editors.push({ name: safeAuthor, lastSeen: share.updatedAt });
    share.activeEditors = editors.slice(-8);
    saveStore(store);

    broadcastCollab(token, 'doc-update', {
      title: share.title,
      html: share.html,
      content: share.content,
      authorName: safeAuthor,
      updatedAt: share.updatedAt,
      activeEditors: share.activeEditors,
    });
    res.json({ ok: true, updatedAt: share.updatedAt });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Notely server running at http://localhost:${port}`);
  });
}

startServer();
