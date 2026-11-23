import React, { useState } from 'react';
import { AlertCircle, MessageSquare, Plus, Trash2, UserCheck, Users } from 'lucide-react';
import { CharacterProfile, ScriptAnalyticsReport } from '../types/screenplay';
import {
  Button,
  Card,
  IconButton,
  Input,
  Select,
  Slider,
  Textarea,
  WorkspaceHeader,
} from './ui';

interface CharacterHubProps {
  profiles: CharacterProfile[];
  analytics: ScriptAnalyticsReport;
  onAddCharacter: (profile: CharacterProfile) => void;
  onUpdateCharacter: (id: string, patch: Partial<CharacterProfile>) => void;
  onDeleteCharacter: (id: string) => void;
}

const ARCHETYPES: CharacterProfile['roleArchetype'][] = [
  'Protagonist',
  'Antagonist',
  'Deuteragonist',
  'Catalyst',
  'Supporting',
  'Cameo',
];

export const CharacterHub: React.FC<CharacterHubProps> = ({
  profiles,
  analytics,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
}) => {
  const [newName, setNewName] = useState('');
  const [duplicateFeedback, setDuplicateFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateCharacter = (nameInput?: string) => {
    const clean = (nameInput ?? newName).trim().toUpperCase();
    if (!clean) return;
    if (profiles.some((p) => p.name.trim().toUpperCase() === clean)) {
      setDuplicateFeedback(`Character "${clean}" already exists in your Character Bible.`);
      return;
    }

    onAddCharacter({
      id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      nativeName: '',
      roleArchetype: 'Protagonist',
      ageRange: '25–35',
      dialectNotes: '',
      motivation: '',
      arcSummary: '',
      voicePitch: 1.0,
      voiceRate: 1.0,
    });
    setNewName('');
    setDuplicateFeedback(null);
  };

  const unprofiledScriptCharacters = analytics.characters.filter(
    (sc) => !profiles.some((p) => p.name.trim().toUpperCase() === sc.name.trim().toUpperCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <WorkspaceHeader
        title="Character Bible, Dialect Notes & Speaking Breakdown"
        subtitle="Develop character motivations, dialect cues, and voice parameters for Table-Read synthesis."
        icon={<Users className="w-4 h-4" />}
        actions={
          <>
            <Input
              aria-label="New Character Name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (duplicateFeedback) setDuplicateFeedback(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCharacter();
              }}
              placeholder="NEW CHARACTER NAME..."
              className="uppercase w-52"
            />
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleCreateCharacter()}
            >
              Add Character Card
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        {duplicateFeedback && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/35 text-xs text-amber-500"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{duplicateFeedback}</span>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setDuplicateFeedback(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {unprofiledScriptCharacters.length > 0 && (
          <Card className="p-4 border-amber-500/30 bg-amber-500/10 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[var(--text-primary)]">
              <span className="font-semibold text-amber-500">Characters Detected in Screenplay: </span>
              <span className="text-[var(--text-secondary)]">
                Click any character below to create their Character Bible card.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {unprofiledScriptCharacters.map((c) => (
                <Button
                  key={c.name}
                  variant="amber-soft"
                  size="xs"
                  leftIcon={<Plus className="w-3 h-3" />}
                  onClick={() => handleCreateCharacter(c.name)}
                  className="font-mono"
                >
                  {c.name} ({c.dialogueBlocks})
                </Button>
              ))}
            </div>
          </Card>
        )}

        {profiles.length === 0 ? (
          <Card className="p-12 text-center">
            <UserCheck className="w-8 h-8 text-amber-500 mx-auto mb-3 opacity-80" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              No Character Profiles Created Yet
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
              Enter a character name above or start writing character dialogue in the Screenplay Editor to populate speaking statistics automatically.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((prof) => {
              const stats = analytics.characters.find(
                (c) => c.name.trim().toUpperCase() === prof.name.trim().toUpperCase()
              );
              const isConfirmingDelete = confirmDeleteId === prof.id;

              return (
                <Card key={prof.id} className="p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        aria-label="Character Name"
                        value={prof.name}
                        onChange={(e) =>
                          onUpdateCharacter(prof.id, { name: e.target.value.toUpperCase() })
                        }
                        className="bg-transparent font-script font-bold text-base uppercase tracking-wider text-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 rounded w-full"
                      />
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-amber-500" />
                          {stats?.dialogueBlocks ?? 0} speeches ({stats?.wordCount ?? 0} words)
                        </span>
                        <span>•</span>
                        <span>{stats?.sceneAppearances ?? 0} scenes</span>
                        <span>•</span>
                        <span>~{stats?.estimatedSpeakingSeconds ?? 0}s screen speech</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Select<CharacterProfile['roleArchetype']>
                        ariaLabel="Character Role Archetype"
                        size="xs"
                        value={prof.roleArchetype}
                        onChange={(val) => onUpdateCharacter(prof.id, { roleArchetype: val })}
                        options={ARCHETYPES.map((arch) => ({ value: arch, label: arch }))}
                      />

                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => {
                              onDeleteCharacter(prof.id);
                              setConfirmDeleteId(null);
                            }}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <IconButton
                          size="xs"
                          variant="danger"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setConfirmDeleteId(prof.id)}
                          title="Delete Character Profile"
                          aria-label={`Delete ${prof.name}`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Native / Regional Name"
                      value={prof.nativeName ?? ''}
                      onChange={(e) =>
                        onUpdateCharacter(prof.id, { nativeName: e.target.value })
                      }
                      placeholder="e.g., विक्रम / விக்ரம் / విక్రమ్"
                    />
                    <Input
                      label="Age Range"
                      value={prof.ageRange}
                      onChange={(e) => onUpdateCharacter(prof.id, { ageRange: e.target.value })}
                      placeholder="e.g., Late 20s / 40s"
                    />
                  </div>

                  <Input
                    label="Diction / Dialect Notes"
                    value={prof.dialectNotes}
                    onChange={(e) =>
                      onUpdateCharacter(prof.id, { dialectNotes: e.target.value })
                    }
                    placeholder="e.g., Conversational Hindi / Formal English / Hyderabadi cadence"
                  />

                  <Input
                    label="Core Dramatic Motivation & Conflict"
                    value={prof.motivation}
                    onChange={(e) => onUpdateCharacter(prof.id, { motivation: e.target.value })}
                    placeholder="What does this character want, and what stands in their way?"
                  />

                  <Textarea
                    label="Character Arc & Transformation"
                    rows={2}
                    value={prof.arcSummary}
                    onChange={(e) => onUpdateCharacter(prof.id, { arcSummary: e.target.value })}
                    placeholder="Act I state → Midpoint / Interval shift → Climax resolution..."
                  />

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
                    <Slider
                      label="Table-Read Pitch"
                      value={prof.voicePitch}
                      min={0.6}
                      max={1.4}
                      step={0.1}
                      onChange={(val) => onUpdateCharacter(prof.id, { voicePitch: val })}
                    />
                    <Slider
                      label="Table-Read Rate"
                      value={prof.voiceRate}
                      min={0.7}
                      max={1.5}
                      step={0.1}
                      unit="x"
                      onChange={(val) => onUpdateCharacter(prof.id, { voiceRate: val })}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
