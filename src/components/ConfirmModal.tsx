import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Button, Modal } from './ui';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      maxWidthClass="max-w-md"
      icon={
        danger ? (
          <AlertTriangle className="w-4 h-4 text-[var(--danger-text)]" />
        ) : (
          <HelpCircle className="w-4 h-4" />
        )
      }
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
        {message}
      </p>
    </Modal>
  );
};
