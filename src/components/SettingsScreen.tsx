import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Cloud,
  Download,
  Edit3,
  Fingerprint,
  HardDrive,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  Moon,
  Palette,
  Save,
  Shield,
  Sliders,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { useNotely } from '../context/NotelyContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppButton, BottomSheet, SettingsTile } from './DesignSystem';
import { PinLockScreen } from './PinLockScreen';
import { ACCENT_COLORS, type AccentColorKey, type ThemeMode } from '../types/notely';

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full p-0.5 transition-colors cursor-pointer ${
        checked ? 'bg-[var(--notely-accent)]' : 'bg-[#DEDCE6] dark:bg-[#343245]'
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function SettingsScreen() {
  const {
    user,
    settings,
    storageBreakdown,
    documents,
    setTheme,
    setAccentColor,
    updateUserProfile,
    updateEditorPreferences,
    toggleAppLock,
    toggleBiometric,
    lockAppNow,
    clearTemporaryData,
    exportWorkspaceBackup,
    importWorkspaceBackup,
    syncPushToCloud,
    syncPullFromCloud,
    showToast,
  } = useNotely();

  const [profileOpen, setProfileOpen] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [editorPrefsOpen, setEditorPrefsOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [aboutModal, setAboutModal] = useState<'privacy' | 'terms' | 'help' | 'licenses' | null>(null);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const [profileName, setProfileName] = useState(user.name);
  const [workspaceName, setWorkspaceName] = useState(user.workspaceName);
  const [workspaceDesc, setWorkspaceDesc] = useState(user.workspaceDescription);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const isDark = settings.theme === 'dark';

  const handleToggleAppLock = async (next: boolean) => {
    if (next && !settings.securityPreferences.pinHash) {
      setPinSetupOpen(true);
      return;
    }
    await toggleAppLock(next);
    showToast(next ? 'App lock enabled' : 'App lock disabled', 'info');
  };

  const handleExportBackup = () => {
    const json = exportWorkspaceBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notely-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup JSON downloaded', 'success');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importWorkspaceBackup(text);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Invalid backup file', 'error');
    } finally {
      e.target.value = '';
    }
  };

  if (pinSetupOpen) {
    return (
      <div className="fixed inset-0 z-50">
        <PinLockScreen
          mode="setup"
          title="Notely Security"
          onSuccess={() => setPinSetupOpen(false)}
          onCancel={() => setPinSetupOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-28 md:pb-12 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#24232B] dark:text-[#F4F3F8]">
        Settings
      </h1>

      {/* Purple Workspace Profile Card matching Reference 2 */}
      <div
        className="rounded-3xl p-5 text-white flex items-center gap-4 shadow-lg"
        style={{
          background:
            'linear-gradient(135deg, var(--notely-accent) 0%, var(--notely-accent-deep) 100%)',
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-white text-[var(--notely-accent)] flex items-center justify-center text-xl font-bold shrink-0">
          {user.avatar || 'W'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold truncate">{user.name}</div>
          <div className="text-xs text-white/85 truncate">
            {user.workspaceName} · {user.workspaceDescription}
          </div>
        </div>
        <button
          type="button"
          aria-label="Edit workspace profile"
          onClick={() => {
            setProfileName(user.name);
            setWorkspaceName(user.workspaceName);
            setWorkspaceDesc(user.workspaceDescription);
            setProfileOpen(true);
          }}
          className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <Edit3 className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* APPEARANCE */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-[#92909D] uppercase px-1">
          Appearance
        </h2>
        <div className="notely-card rounded-3xl divide-y divide-[#ECEAF1] dark:divide-[#2A2838] overflow-hidden">
          <SettingsTile
            icon={<Moon className="w-5 h-5" />}
            iconBg={isDark ? '#2C214A' : '#F0E9FF'}
            iconColor="#8950F5"
            title="Dark mode"
            subtitle="Easier on the eyes at night"
            right={
              <ToggleSwitch
                label="Toggle dark mode"
                checked={isDark}
                onChange={(next) => setTheme(next ? 'dark' : 'light')}
              />
            }
          />
          <SettingsTile
            icon={<Sliders className="w-5 h-5" />}
            iconBg={isDark ? '#1C2E4A' : '#EAF3FF'}
            iconColor="#438CEB"
            title="Theme mode"
            subtitle={`Current: ${settings.theme}`}
            right={
              <select
                aria-label="Theme mode"
                value={settings.theme}
                onChange={(e) => setTheme(e.target.value as ThemeMode)}
                className="h-8 px-2.5 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold text-[#24232B] dark:text-[#F4F3F8]"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            }
          />
          <SettingsTile
            icon={<Palette className="w-5 h-5" />}
            iconBg={isDark ? '#3D1B30' : '#FCE8F3'}
            iconColor="#EC4899"
            title="Accent system"
            subtitle="Purple · green · blue · yellow"
            right={
              <div className="flex items-center gap-2">
                {(['purple', 'green', 'blue', 'yellow'] as AccentColorKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={`${ACCENT_COLORS[key].label} accent`}
                    onClick={() => setAccentColor(key)}
                    className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                      settings.accentColor === key
                        ? 'ring-2 ring-offset-2 ring-[#24232B] dark:ring-white scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: ACCENT_COLORS[key].primary }}
                  />
                ))}
              </div>
            }
          />
        </div>
      </section>

      {/* SECURITY */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-[#92909D] uppercase px-1">
          Security
        </h2>
        <div className="notely-card rounded-3xl divide-y divide-[#ECEAF1] dark:divide-[#2A2838] overflow-hidden">
          <SettingsTile
            icon={<Lock className="w-5 h-5" />}
            iconBg={isDark ? '#1C2E4A' : '#EAF3FF'}
            iconColor="#438CEB"
            title="App lock"
            subtitle="Require a PIN to open Notely"
            right={
              <ToggleSwitch
                label="Toggle app lock"
                checked={settings.securityPreferences.appLockEnabled}
                onChange={handleToggleAppLock}
              />
            }
          />
          <SettingsTile
            icon={<KeyRound className="w-5 h-5" />}
            iconBg={isDark ? '#2C214A' : '#F0E9FF'}
            iconColor="#8950F5"
            title={settings.securityPreferences.pinHash ? 'Change PIN' : 'Set up PIN'}
            subtitle={
              settings.securityPreferences.pinHash
                ? '4-digit PIN configured'
                : 'Protect Notely with a 4-digit PIN'
            }
            right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
            onClick={() => setPinSetupOpen(true)}
          />
          <SettingsTile
            icon={<Fingerprint className="w-5 h-5" />}
            iconBg={isDark ? '#183629' : '#E8F8F0'}
            iconColor="#22C55E"
            title="Biometric lock"
            subtitle="Allow fingerprint / device biometric unlock"
            right={
              <ToggleSwitch
                label="Toggle biometric lock"
                checked={settings.securityPreferences.biometricEnabled}
                onChange={toggleBiometric}
              />
            }
          />
          {settings.securityPreferences.pinHash && (
            <SettingsTile
              icon={<Shield className="w-5 h-5" />}
              iconBg={isDark ? '#3B3014' : '#FFF6D9'}
              iconColor="#EAB308"
              title="Lock Notely now"
              subtitle={`${documents.filter((d) => d.isLocked).length} private encrypted notes`}
              right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
              onClick={lockAppNow}
            />
          )}
        </div>
      </section>

      {/* EDITOR */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-[#92909D] uppercase px-1">
          Editor
        </h2>
        <div className="notely-card rounded-3xl divide-y divide-[#ECEAF1] dark:divide-[#2A2838] overflow-hidden">
          <SettingsTile
            icon={<CheckCircle2 className="w-5 h-5" />}
            iconBg={isDark ? '#183629' : '#E8F8F0'}
            iconColor="#39B980"
            title="Spelling & grammar"
            subtitle="Auto-check while reviewing"
            right={
              <ToggleSwitch
                label="Toggle spelling and grammar"
                checked={settings.editorPreferences.spellingAndGrammar}
                onChange={(v) => updateEditorPreferences({ spellingAndGrammar: v })}
              />
            }
          />
          <SettingsTile
            icon={<Save className="w-5 h-5" />}
            iconBg={isDark ? '#1C2E4A' : '#EAF3FF'}
            iconColor="#438CEB"
            title="Auto-save"
            subtitle={
              settings.editorPreferences.autoSave
                ? 'Always on · saves as you type'
                : 'Manual save mode'
            }
            right={
              <ToggleSwitch
                label="Toggle auto-save"
                checked={settings.editorPreferences.autoSave}
                onChange={(v) => updateEditorPreferences({ autoSave: v })}
              />
            }
          />
          <SettingsTile
            icon={<Clock className="w-5 h-5" />}
            iconBg={isDark ? '#3B3014' : '#FFF6D9'}
            iconColor="#EAB308"
            title="Version history"
            subtitle="Snapshots kept for every note"
            right={
              <ToggleSwitch
                label="Toggle version history"
                checked={settings.editorPreferences.versionHistory}
                onChange={(v) => updateEditorPreferences({ versionHistory: v })}
              />
            }
          />
          <SettingsTile
            icon={<Sliders className="w-5 h-5" />}
            iconBg={isDark ? '#2C214A' : '#F0E9FF'}
            iconColor="#8950F5"
            title="Typography & defaults"
            subtitle={`${settings.editorPreferences.defaultFont} · ${settings.editorPreferences.defaultFontSize}px`}
            right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
            onClick={() => setEditorPrefsOpen(true)}
          />
        </div>
      </section>

      {/* STORAGE & BACKUP */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-[#92909D] uppercase px-1">
          Storage &amp; Backup
        </h2>
        <div className="notely-card rounded-3xl divide-y divide-[#ECEAF1] dark:divide-[#2A2838] overflow-hidden">
          <SettingsTile
            icon={<HardDrive className="w-5 h-5" />}
            iconBg={isDark ? '#183629' : '#E8F8F0'}
            iconColor="#22C55E"
            title="Local storage & cache"
            subtitle={`${formatBytes(storageBreakdown.totalBytes)} used on this device`}
            right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
            onClick={() => setStorageOpen(true)}
          />
          <SettingsTile
            icon={<Download className="w-5 h-5" />}
            iconBg={isDark ? '#2C214A' : '#F0E9FF'}
            iconColor="#8950F5"
            title="Backup workspace"
            subtitle="Download full .json snapshot of notes & notebooks"
            right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
            onClick={handleExportBackup}
          />
          <SettingsTile
            icon={<Upload className="w-5 h-5" />}
            iconBg={isDark ? '#1C2E4A' : '#EAF3FF'}
            iconColor="#438CEB"
            title="Restore from backup"
            subtitle="Import a Notely .json backup file"
            right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
            onClick={() => restoreInputRef.current?.click()}
          />
          <SettingsTile
            icon={<Cloud className="w-5 h-5" />}
            iconBg={isDark ? '#163634' : '#E6FAF8'}
            iconColor="#14B8A6"
            title="Cloud sync"
            subtitle={
              settings.lastSyncedAt
                ? `Last synced ${new Date(settings.lastSyncedAt).toLocaleString()}`
                : 'Push or pull encrypted workspace snapshot'
            }
            right={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={syncPushToCloud}
                  className="px-2.5 py-1 rounded-lg bg-[var(--notely-accent)] text-white text-xs font-semibold cursor-pointer"
                >
                  Push
                </button>
                <button
                  type="button"
                  onClick={syncPullFromCloud}
                  className="px-2.5 py-1 rounded-lg bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold cursor-pointer"
                >
                  Pull
                </button>
              </div>
            }
          />
        </div>
        <input
          ref={restoreInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleRestoreFile}
        />
      </section>

      {/* ABOUT */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-[#92909D] uppercase px-1">
          About
        </h2>
        <div className="notely-card rounded-3xl divide-y divide-[#ECEAF1] dark:divide-[#2A2838] overflow-hidden">
          <SettingsTile
            icon={<Info className="w-5 h-5" />}
            iconBg={isDark ? '#2C214A' : '#F0E9FF'}
            iconColor="#8950F5"
            title="Notely"
            subtitle="Version 1.0.0 · Offline-First Document Workspace"
          />
          <SettingsTile
            icon={<Shield className="w-5 h-5" />}
            iconBg={isDark ? '#183629' : '#E8F8F0'}
            iconColor="#22C55E"
            title="Privacy Policy & Terms"
            subtitle="Your notes stay stored locally unless you choose to share"
            right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
            onClick={() => setAboutModal('privacy')}
          />
          <SettingsTile
            icon={<HelpCircle className="w-5 h-5" />}
            iconBg={isDark ? '#1C2E4A' : '#EAF3FF'}
            iconColor="#438CEB"
            title="Help & Open Source Licenses"
            subtitle="TipTap, jsPDF, docx, JSZip, Mammoth, Lucide"
            right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
            onClick={() => setAboutModal('help')}
          />
          {!isInstalled && (isInstallable || isIOS) && (
            <SettingsTile
              icon={<Smartphone className="w-5 h-5" />}
              iconBg={isDark ? '#2C214A' : '#F0E9FF'}
              iconColor="#8950F5"
              title="Install Notely App"
              subtitle="Add to home screen for offline fullscreen access"
              right={<ChevronRight className="w-4 h-4 text-[#92909D]" />}
              onClick={async () => {
                if (isInstallable) {
                  const ok = await install();
                  if (ok) showToast('Notely installed on device', 'success');
                } else {
                  setIosInstallOpen(true);
                }
              }}
            />
          )}
        </div>
      </section>

      {/* Profile Modal */}
      <BottomSheet open={profileOpen} onClose={() => setProfileOpen(false)} title="Edit profile">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await updateUserProfile({
              name: profileName.trim() || 'Writer',
              workspaceName: workspaceName.trim() || 'Personal workspace',
              workspaceDescription: workspaceDesc.trim() || 'stored on this device',
            });
            setProfileOpen(false);
            showToast('Profile updated', 'success');
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Display name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Workspace name</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Description</label>
            <input
              type="text"
              value={workspaceDesc}
              onChange={(e) => setWorkspaceDesc(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setProfileOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit">Save</AppButton>
          </div>
        </form>
      </BottomSheet>

      {/* Editor Defaults Modal */}
      <BottomSheet
        open={editorPrefsOpen}
        onClose={() => setEditorPrefsOpen(false)}
        title="Default editor typography"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Default font</label>
            <select
              value={settings.editorPreferences.defaultFont}
              onChange={(e) => updateEditorPreferences({ defaultFont: e.target.value })}
              className="w-full h-11 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="DM Sans">DM Sans</option>
              <option value="Lora">Lora (Serif)</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Font size (px)</label>
              <input
                type="number"
                min={12}
                max={28}
                value={settings.editorPreferences.defaultFontSize}
                onChange={(e) =>
                  updateEditorPreferences({ defaultFontSize: Number(e.target.value) || 16 })
                }
                className="w-full h-11 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C5A68] mb-1">Line spacing</label>
              <input
                type="number"
                step={0.1}
                min={1.1}
                max={2.5}
                value={settings.editorPreferences.defaultLineSpacing}
                onChange={(e) =>
                  updateEditorPreferences({ defaultLineSpacing: Number(e.target.value) || 1.6 })
                }
                className="w-full h-11 px-3 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium">Automatic markdown shortcuts</span>
            <ToggleSwitch
              label="Auto formatting"
              checked={settings.editorPreferences.autoFormatting}
              onChange={(v) => updateEditorPreferences({ autoFormatting: v })}
            />
          </div>
        </div>
      </BottomSheet>

      {/* Storage Breakdown Modal */}
      <BottomSheet
        open={storageOpen}
        onClose={() => setStorageOpen(false)}
        title="Storage management"
      >
        <div className="space-y-4">
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-[#5C5A68] dark:text-[#B2B0BE]">Documents &amp; Versions</span>
              <span className="font-bold tabular-nums">{formatBytes(storageBreakdown.documentsBytes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5C5A68] dark:text-[#B2B0BE]">Images, Drawings &amp; Audio</span>
              <span className="font-bold tabular-nums">{formatBytes(storageBreakdown.mediaBytes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5C5A68] dark:text-[#B2B0BE]">Templates &amp; Metadata</span>
              <span className="font-bold tabular-nums">{formatBytes(storageBreakdown.otherBytes)}</span>
            </div>
            <div className="border-t border-[#ECEAF1] dark:border-[#2A2838] pt-2.5 flex justify-between text-base font-bold">
              <span>Total Device Storage</span>
              <span className="text-[var(--notely-accent)] tabular-nums">
                {formatBytes(storageBreakdown.totalBytes)}
              </span>
            </div>
          </div>
          <AppButton
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await clearTemporaryData();
              setStorageOpen(false);
            }}
          >
            <Trash2 className="w-4 h-4" />
            Clear Temporary Files &amp; Search Cache
          </AppButton>
        </div>
      </BottomSheet>

      {/* About Modal */}
      <BottomSheet
        open={Boolean(aboutModal)}
        onClose={() => setAboutModal(null)}
        title={aboutModal === 'privacy' ? 'Privacy Policy & Terms' : 'Help & Open Source Licenses'}
      >
        {aboutModal === 'privacy' ? (
          <div className="space-y-3 text-sm text-[#5C5A68] dark:text-[#B2B0BE] leading-relaxed">
            <p>
              <strong>Offline-First Privacy:</strong> All notes, notebooks, drawings, and version
              snapshots are stored locally on your device in IndexedDB.
            </p>
            <p>
              <strong>Encryption &amp; Lock:</strong> App PIN hashes use SHA-256 and private locked
              notes use WebCrypto PBKDF2 + AES-GCM 256-bit encryption before persistence.
            </p>
            <p>
              <strong>Cloud &amp; Sharing:</strong> Content is transmitted to the server only when you
              explicitly tap Push/Pull Cloud Sync or generate a shareable collaboration link.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-[#5C5A68] dark:text-[#B2B0BE] leading-relaxed">
            <p>
              <strong>Quick Tips:</strong> Tap the purple <strong>+</strong> button inside any note
              to insert tables, freehand drawings, interactive charts, equations, footnotes,
              bookmarks, or scanned pages.
            </p>
            <p>
              <strong>Open Source Credits:</strong> Built with React, TypeScript, TipTap
              (ProseMirror), jsPDF, docx, JSZip, Mammoth, Marked, Turndown, and Lucide Icons.
            </p>
          </div>
        )}
      </BottomSheet>

      {/* iOS PWA Install Instructions Modal */}
      <BottomSheet
        open={iosInstallOpen}
        onClose={() => setIosInstallOpen(false)}
        title="Install Notely on iOS"
      >
        <div className="space-y-3 text-sm text-[#5C5A68] dark:text-[#B2B0BE] leading-relaxed pb-2">
          <p>To install Notely on your iPhone or iPad for offline fullscreen editing:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Tap the <strong>Share</strong> icon in Safari’s toolbar.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> in the top-right corner.</li>
          </ol>
          <div className="flex justify-end pt-2">
            <AppButton onClick={() => setIosInstallOpen(false)}>Got it</AppButton>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
