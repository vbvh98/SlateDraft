import React, { useState } from 'react';
import { BookOpen, CheckCircle2, FileText, Info, Layers, Sparkles } from 'lucide-react';
import { ScriptTemplate } from '../types/screenplay';
import { INDUSTRY_TEMPLATES } from '../data/templates';
import { LANGUAGE_METADATA } from '../services/transliterationEngine';
import { Badge, Button, Card, Tabs, WorkspaceHeader } from './ui';

interface TemplateGalleryProps {
  activeTemplateId: string;
  onApplyTemplate: (template: ScriptTemplate) => void;
}

type CategoryFilter = 'All' | ScriptTemplate['category'];

const CATEGORY_TABS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'All', label: 'All Templates' },
  { id: 'Indian Cinema', label: 'Indian Cinema' },
  { id: 'OTT & Series', label: 'OTT & Series' },
  { id: 'Commercial & AV', label: 'Commercial & AV' },
  { id: 'International & Indie', label: 'International & Indie' },
  { id: 'Stage & Short', label: 'Stage & Short' },
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  activeTemplateId,
  onApplyTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  const filteredTemplates = INDUSTRY_TEMPLATES.filter(
    (tpl) => selectedCategory === 'All' || tpl.category === selectedCategory
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <WorkspaceHeader
        title="Screenwriting & Production Template Library"
        subtitle="Start with a clean structural blueprint calibrated for Theatrical Features, OTT Series Rooms, Commercial AV Splits, or Short Films."
        icon={<BookOpen className="w-4 h-4" />}
        actions={
          <Tabs
            items={CATEGORY_TABS}
            activeId={selectedCategory}
            onChange={setSelectedCategory}
          />
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Template Count & Replacement Clarification Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                Showing {filteredTemplates.length} of {INDUSTRY_TEMPLATES.length}
              </span>
              <span>
                {selectedCategory === 'All' ? 'studio templates' : `templates in ${selectedCategory}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                Loading a template replaces your current draft structure (undoable via ⌘Z).
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((tpl) => {
              const isActive = activeTemplateId === tpl.id;
              const langMeta = LANGUAGE_METADATA[tpl.defaultLanguage];

              return (
                <Card
                  key={tpl.id}
                  interactive
                  className={`p-5 flex flex-col justify-between gap-4 ${
                    isActive ? 'border-amber-500/60 ring-1 ring-amber-500/30' : ''
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            {tpl.name}
                          </h3>
                          {isActive && (
                            <Badge variant="amber" uppercase>
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-500 font-mono mt-0.5">
                          {tpl.nativeSubtitle} • {tpl.estimatedLength}
                        </p>
                      </div>

                      <Badge variant="stone" mono>
                        {tpl.category}
                      </Badge>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {tpl.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {tpl.badges.map((b) => (
                        <Badge key={b} variant="amber">
                          {b}
                        </Badge>
                      ))}
                      <Badge variant="outline" mono>
                        Default: {langMeta.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{tpl.structureType}</span>
                    </div>

                    <Button
                      variant={isActive ? 'amber-soft' : 'primary'}
                      size="sm"
                      title="Replaces the current draft structure with this template"
                      leftIcon={
                        isActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : tpl.targetWorkspace === 'av-split' ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={() => onApplyTemplate(tpl)}
                    >
                      {isActive ? 'Reload & Replace Draft' : 'Load & Replace Draft'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
