import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { TitlePageData } from '../types/screenplay';
import { Badge, Button, Input, Modal, Textarea } from './ui';

export interface TitlePageModalProps {
  open: boolean;
  onClose: () => void;
  titlePage: TitlePageData;
  onUpdateTitlePage: (patch: Partial<TitlePageData>) => void;
}

export const TitlePageModal: React.FC<TitlePageModalProps> = ({
  open,
  onClose,
  titlePage,
  onUpdateTitlePage,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Title Page, SWA Registration & Security Watermark"
      subtitle="Industry metadata for Final Draft (.fdx), Fountain, and watermarked studio PDFs."
      icon={<ShieldCheck className="w-4 h-4" />}
      maxWidthClass="max-w-2xl"
      footer={
        <Button variant="primary" size="md" onClick={onClose}>
          Save &amp; Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Screenplay Title"
            value={titlePage.title}
            onChange={(e) => onUpdateTitlePage({ title: e.target.value })}
            placeholder="UNTITLED SCREENPLAY"
          />
          <Input
            label="Secondary / Regional Title (Optional)"
            value={titlePage.nativeTitle}
            onChange={(e) => onUpdateTitlePage({ nativeTitle: e.target.value })}
            placeholder="Optional alternate or regional script title"
          />
        </div>

        <Textarea
          label="Logline / Pitch Synopsis"
          rows={2}
          value={titlePage.logline}
          onChange={(e) => onUpdateTitlePage({ logline: e.target.value })}
          placeholder="One-to-two sentence logline for title page or deck export..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Screenplay Written By"
            value={titlePage.writtenBy}
            onChange={(e) => onUpdateTitlePage({ writtenBy: e.target.value })}
            placeholder="Writer Name"
          />
          <Input
            label="Story By"
            value={titlePage.storyBy}
            onChange={(e) => onUpdateTitlePage({ storyBy: e.target.value })}
            placeholder="Story Credit"
          />
          <Input
            label="Dialogues By"
            value={titlePage.dialoguesBy}
            onChange={(e) => onUpdateTitlePage({ dialoguesBy: e.target.value })}
            placeholder="Dialogue Writer Credit"
          />
          <Input
            label="Lyrics By"
            value={titlePage.lyricsBy}
            onChange={(e) => onUpdateTitlePage({ lyricsBy: e.target.value })}
            placeholder="Lyricist Credit"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Production House / Studio"
            value={titlePage.productionHouse}
            onChange={(e) => onUpdateTitlePage({ productionHouse: e.target.value })}
            placeholder="Studio / Banner Name"
          />
          <Input
            label="SWA / WGA Registration #"
            mono
            value={titlePage.swaRegistrationNumber}
            onChange={(e) => onUpdateTitlePage({ swaRegistrationNumber: e.target.value })}
            placeholder="SWA-2026-XXXXXX"
          />
          <Input
            label="Draft Name"
            value={titlePage.draftName}
            onChange={(e) => onUpdateTitlePage({ draftName: e.target.value })}
            placeholder="First Draft"
          />
          <Input
            label="Draft Date"
            value={titlePage.draftDate}
            onChange={(e) => onUpdateTitlePage({ draftDate: e.target.value })}
            placeholder="e.g. November 2026"
          />
        </div>

        <Textarea
          label="Contact Info / Representation"
          rows={2}
          value={titlePage.contactInfo}
          onChange={(e) => onUpdateTitlePage({ contactInfo: e.target.value })}
          placeholder="Writer or agency email, phone number, or production office address..."
        />

        {/* Anti-Leak Security Watermark Box */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--accent-border)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="amber" uppercase>
                Script Confidentiality
              </Badge>
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Diagonal Security Watermark Overlay
              </span>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={titlePage.watermarkEnabled}
                onChange={(e) => onUpdateTitlePage({ watermarkEnabled: e.target.checked })}
                className="accent-amber-500 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
              />
              <span>Enable Watermark</span>
            </label>
          </div>

          <Input
            label="Recipient Trace Watermark Text"
            mono
            value={titlePage.watermarkText}
            onChange={(e) => onUpdateTitlePage({ watermarkText: e.target.value })}
            placeholder="CONFIDENTIAL — FOR PRODUCTION REVIEW ONLY"
          />
        </div>
      </div>
    </Modal>
  );
};
