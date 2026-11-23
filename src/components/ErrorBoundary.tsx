import React from 'react';
import { AlertTriangle, Download, RotateCcw } from 'lucide-react';
import { Button } from './ui';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  onEmergencyExport?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  exportedNotice: boolean;
}

function fallbackExportFromStorage(): void {
  try {
    const raw = window.localStorage.getItem('slatedraft-workspace-v1');
    let content = '';
    if (raw) {
      const parsed = JSON.parse(raw) as {
        titlePage?: { title?: string; writtenBy?: string };
        blocks?: Array<{ elementType?: string; text?: string }>;
      };
      const lines: string[] = [];
      if (parsed.titlePage?.title) {
        lines.push(`Title: ${parsed.titlePage.title}`);
      }
      if (parsed.titlePage?.writtenBy) {
        lines.push(`Author: ${parsed.titlePage.writtenBy}`);
      }
      if (lines.length > 0) {
        lines.push('');
      }
      for (const block of parsed.blocks ?? []) {
        if (typeof block?.text === 'string' && block.text.trim()) {
          lines.push(block.text);
          lines.push('');
        }
      }
      content = lines.join('\n');
    }

    const blob = new Blob([content || '/* SlateDraft Recovery Export — No cached blocks found */\n'], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slatedraft-recovery-${new Date().toISOString().slice(0, 10)}.fountain`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Ignore storage/download errors in emergency recovery
  }
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      exportedNotice: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      exportedNotice: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[SlateDraft ErrorBoundary]', error, errorInfo);
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleEmergencyExport = (): void => {
    try {
      if (this.props.onEmergencyExport) {
        this.props.onEmergencyExport();
      } else {
        fallbackExportFromStorage();
      }
      this.setState({ exportedNotice: true });
    } catch {
      fallbackExportFromStorage();
      this.setState({ exportedNotice: true });
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-primary)] p-6">
        <div
          role="alert"
          className="w-full max-w-lg rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-modal)] overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                SlateDraft Studio Recovery
              </p>
              <h1 className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
                The workspace encountered an unexpected render error
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Your script is autosaved locally on this device. You can export a safe Fountain
                backup right now or reload the workspace.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            {this.state.error?.message && (
              <div className="rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] px-3.5 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Diagnostic Detail
                </div>
                <p className="text-xs font-mono text-[var(--text-secondary)] break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {this.state.exportedNotice && (
              <div className="rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3.5 py-2 text-xs text-[var(--accent-text)]">
                Recovery Fountain file exported. You can safely reload the workspace now.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={this.handleEmergencyExport}
              >
                Export Recovery (.fountain)
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={this.handleReload}
              >
                Reload Workspace
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
