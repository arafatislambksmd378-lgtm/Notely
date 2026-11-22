import React, { useState } from 'react';
import {
  ChevronRight,
  Code2,
  Copy,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Globe,
  Link2,
  Printer,
  Share2,
  ShieldOff,
  Upload,
} from 'lucide-react';
import { BottomSheet } from '../DesignSystem';
import { useNotely } from '../../context/NotelyContext';
import {
  generateExport,
  shareExportedFile,
  triggerFileDownload,
  type ExportFormat,
} from '../../utils/exportEngine';
import type { DocumentRecord } from '../../types/notely';

export function ShareExportSheet({
  open,
  onClose,
  doc,
  onMakeCopy,
  onOpenImport,
}: {
  open: boolean;
  onClose: () => void;
  doc: DocumentRecord;
  onMakeCopy: () => void;
  onOpenImport: () => void;
}) {
  const { shares, createDocumentShare, revokeDocumentShare, showToast } = useNotely();
  const [busyFormat, setBusyFormat] = useState<string | null>(null);
  const [sharePerm, setSharePerm] = useState<'view' | 'edit'>('view');
  const [shareExpiryHours, setShareExpiryHours] = useState<number>(24);

  const docShares = shares.filter((s) => s.documentId === doc.id && !s.revoked);

  const handleDownload = async (format: ExportFormat, label: string) => {
    setBusyFormat(format);
    try {
      const result = await generateExport(doc, format);
      triggerFileDownload(result);
      showToast(`Exported ${result.fileName} (${label})`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to export ${label}`, 'error');
    } finally {
      setBusyFormat(null);
    }
  };

  const handleNativeShare = async () => {
    setBusyFormat('share');
    try {
      const mode = await shareExportedFile(doc, 'pdf');
      showToast(
        mode === 'shared' ? 'Opened device share sheet' : 'PDF downloaded for sharing',
        'success'
      );
    } catch {
      showToast('Share cancelled', 'info');
    } finally {
      setBusyFormat(null);
    }
  };

  const handleCopyContent = async () => {
    await navigator.clipboard.writeText(`${doc.title}\n\n${doc.plainTextCache}`);
    showToast('Document text copied to clipboard', 'success');
  };

  const handlePrint = () => {
    onClose();
    setTimeout(() => window.print(), 180);
  };

  const handleCreateLink = async () => {
    const share = await createDocumentShare(doc.id, sharePerm, shareExpiryHours);
    if (share) {
      const url = `${window.location.origin}/?share=${share.shareToken}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
    }
  };

  const rows: Array<{
    id: string;
    title: string;
    subtitle: string;
    bg: string;
    fg: string;
    icon: React.ReactNode;
    onClick: () => void;
  }> = [
    {
      id: 'share',
      title: 'Share',
      subtitle: 'Email, WhatsApp, Messages and more',
      bg: '#F0E9FF',
      fg: '#8950F5',
      icon: <Share2 className="w-5 h-5" />,
      onClick: handleNativeShare,
    },
    {
      id: 'pdf',
      title: 'PDF document',
      subtitle: 'Print-ready, with your page setup applied',
      bg: '#FEECEC',
      fg: '#EF4444',
      icon: <FileText className="w-5 h-5" />,
      onClick: () => handleDownload('pdf', 'PDF'),
    },
    {
      id: 'docx',
      title: 'Word document (.docx)',
      subtitle: 'Opens in Word, Docs and Pages',
      bg: '#EAF3FF',
      fg: '#3B82F6',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      onClick: () => handleDownload('docx', 'DOCX'),
    },
    {
      id: 'txt',
      title: 'Plain text (.txt)',
      subtitle: 'Clean .txt without formatting',
      bg: '#E8F8F0',
      fg: '#22C55E',
      icon: <FileText className="w-5 h-5" />,
      onClick: () => handleDownload('txt', 'TXT'),
    },
    {
      id: 'md',
      title: 'Markdown (.md)',
      subtitle: 'For devs, blogs and wikis',
      bg: '#FFF6D9',
      fg: '#EAB308',
      icon: <Code2 className="w-5 h-5" />,
      onClick: () => handleDownload('md', 'Markdown'),
    },
    {
      id: 'rtf',
      title: 'Rich Text (.rtf)',
      subtitle: 'Cross-platform formatted document',
      bg: '#FCE8F3',
      fg: '#EC4899',
      icon: <FileText className="w-5 h-5" />,
      onClick: () => handleDownload('rtf', 'RTF'),
    },
    {
      id: 'html',
      title: 'Web page (.html)',
      subtitle: 'Standalone styled HTML5 document',
      bg: '#E6FAF8',
      fg: '#14B8A6',
      icon: <FileCode2 className="w-5 h-5" />,
      onClick: () => handleDownload('html', 'HTML'),
    },
    {
      id: 'odt',
      title: 'OpenDocument (.odt)',
      subtitle: 'LibreOffice & OpenOffice compatible',
      bg: '#FFF1E6',
      fg: '#F97316',
      icon: <FileText className="w-5 h-5" />,
      onClick: () => handleDownload('odt', 'ODT'),
    },
    {
      id: 'print',
      title: 'Print',
      subtitle: 'Send directly to a printer',
      bg: '#F4F3F8',
      fg: '#5C5A68',
      icon: <Printer className="w-5 h-5" />,
      onClick: handlePrint,
    },
    {
      id: 'copy-content',
      title: 'Copy content',
      subtitle: 'Copy document text to clipboard',
      bg: '#EAF3FF',
      fg: '#3B82F6',
      icon: <Copy className="w-5 h-5" />,
      onClick: handleCopyContent,
    },
    {
      id: 'make-copy',
      title: 'Make a copy',
      subtitle: 'Duplicate this note in the same notebook',
      bg: '#F0E9FF',
      fg: '#8950F5',
      icon: <Copy className="w-5 h-5" />,
      onClick: () => {
        onClose();
        onMakeCopy();
      },
    },
    {
      id: 'import',
      title: 'Import document',
      subtitle: 'Load DOCX, PDF, ODT, RTF, HTML, MD, or TXT',
      bg: '#E8F8F0',
      fg: '#22C55E',
      icon: <Upload className="w-5 h-5" />,
      onClick: () => {
        onClose();
        onOpenImport();
      },
    },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Share & export">
      <div className="space-y-4 pb-2">
        <div className="divide-y divide-[#ECEAF1]/60 dark:divide-[#2A2838]/60">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              disabled={busyFormat === row.id}
              onClick={row.onClick}
              className="w-full py-3 flex items-center gap-3.5 text-left hover:bg-[#F8F7FB] dark:hover:bg-[#232131] rounded-xl px-1 transition-colors cursor-pointer"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: row.bg, color: row.fg }}
              >
                {row.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-[#24232B] dark:text-[#F4F3F8]">
                  {busyFormat === row.id ? 'Generating...' : row.title}
                </div>
                <div className="text-xs text-[#92909D] truncate">{row.subtitle}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C2C0CC] dark:text-[#525064] shrink-0" />
            </button>
          ))}
        </div>

        {/* Cloud Collaboration & Shareable Links */}
        <div className="notely-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#24232B] dark:text-[#F4F3F8]">
            <Globe className="w-4.5 h-4.5 text-[var(--notely-accent)]" />
            Cloud Link &amp; Live Collaboration
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sharePerm}
              onChange={(e) => setSharePerm(e.target.value as 'view' | 'edit')}
              aria-label="Share permission"
              className="h-9 px-2.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold"
            >
              <option value="view">Can view</option>
              <option value="edit">Can edit (Real-time)</option>
            </select>
            <select
              value={shareExpiryHours}
              onChange={(e) => setShareExpiryHours(Number(e.target.value))}
              aria-label="Link expiration"
              className="h-9 px-2.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs font-semibold"
            >
              <option value={24}>Expires in 24h</option>
              <option value={168}>Expires in 7 days</option>
              <option value={0}>No expiration</option>
            </select>
            <button
              type="button"
              onClick={handleCreateLink}
              className="h-9 px-3.5 rounded-xl bg-[var(--notely-accent)] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              Create Link
            </button>
          </div>

          {docShares.length > 0 && (
            <div className="space-y-2 pt-1">
              {docShares.map((s) => {
                const url = `${window.location.origin}/?share=${s.shareToken}`;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F4F3F8] dark:bg-[#242232] text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{url}</div>
                      <div className="text-[11px] text-[#92909D]">
                        {s.permission === 'edit' ? 'Edit access' : 'View only'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(url);
                          showToast('Share link copied', 'success');
                        }}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-[#1B1A26] font-semibold cursor-pointer"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        aria-label="Revoke share link"
                        onClick={() => revokeDocumentShare(s.id, s.shareToken)}
                        className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#FEECEC] cursor-pointer"
                      >
                        <ShieldOff className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
