import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Search,
  Tag,
  Download,
  Share2,
  X,
  Sparkles,
  MapPin,
  ChevronRight,
  Bookmark,
  Layers,
} from 'lucide-react';
import { PF1Character, JournalEntry, JournalImage, SketchDetailQuality, ThemeMode } from '../../types/character';
import { generateProceduralPencilSketch } from '../../engine/sketchRenderer';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onOpenAITool?: (initialTab?: 'journal' | 'macro' | 'sketch') => void;
  theme?: ThemeMode;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  onOpenAITool,
  theme = 'parchment',
}) => {
  if (!isOpen) return null;

  const entries: JournalEntry[] = character.journal || [];
  const [selectedEntryId, setSelectedEntryId] = useState<string>(() => {
    return entries.length > 0 ? entries[0].id : '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);

  // New sketch inline form state
  const [isSketchDrawerOpen, setIsSketchDrawerOpen] = useState(false);
  const [sketchPrompt, setSketchPrompt] = useState('');
  const [sketchQuality, setSketchQuality] = useState<SketchDetailQuality>('tasteful');

  // Currently selected or fallback entry
  const selectedEntry = entries.find((e) => e.id === selectedEntryId) || entries[0] || null;

  // New note input for recalled notes
  const [newRecalledNoteText, setNewRecalledNoteText] = useState('');

  // Collect all unique tags across entries
  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags || [])));

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.recalledNotes && e.recalledNotes.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesTag = selectedTag === 'all' || (e.tags && e.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const handleCreateNewEntry = () => {
    const newId = `entry-${Date.now()}`;
    const newEntry: JournalEntry = {
      id: newId,
      title: `Session ${entries.length + 1} Record`,
      sessionDate: `Session ${entries.length + 1} - 4714 AR`,
      realDate: new Date().toISOString().split('T')[0],
      location: character.campaign ? `${character.campaign} Camp` : 'Adventurers Camp',
      content: `The party gathered beneath the flickering lamplight as the session began...\n\n`,
      recalledNotes: ['Inspect perimeter and restock rations before morning'],
      images: [],
      tags: ['Session Log', 'Campaign'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onUpdateCharacter((prev) => ({
      ...prev,
      journal: [newEntry, ...(prev.journal || [])],
    }));
    setSelectedEntryId(newId);
    setIsEditing(true);
  };

  const handleUpdateCurrentEntry = (updates: Partial<JournalEntry>) => {
    if (!selectedEntry) return;
    onUpdateCharacter((prev) => ({
      ...prev,
      journal: (prev.journal || []).map((e) =>
        e.id === selectedEntry.id ? { ...e, ...updates, updatedAt: Date.now() } : e
      ),
    }));
  };

  const handleDeleteEntry = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this journal entry?')) return;
    onUpdateCharacter((prev) => {
      const remaining = (prev.journal || []).filter((e) => e.id !== id);
      return { ...prev, journal: remaining };
    });
    const remaining = entries.filter((e) => e.id !== id);
    if (remaining.length > 0) {
      setSelectedEntryId(remaining[0].id);
    } else {
      setSelectedEntryId('');
    }
  };

  const handleAddRecalledNote = () => {
    if (!newRecalledNoteText.trim() || !selectedEntry) return;
    handleUpdateCurrentEntry({
      recalledNotes: [...(selectedEntry.recalledNotes || []), newRecalledNoteText.trim()],
    });
    setNewRecalledNoteText('');
  };

  const handleRemoveRecalledNote = (index: number) => {
    if (!selectedEntry) return;
    const updated = [...(selectedEntry.recalledNotes || [])];
    updated.splice(index, 1);
    handleUpdateCurrentEntry({ recalledNotes: updated });
  };

  const handleGeneratePencilSketch = () => {
    if (!sketchPrompt.trim() || !selectedEntry) return;
    const dataUrl = generateProceduralPencilSketch({
      subject: sketchPrompt.trim(),
      quality: sketchQuality,
      width: 560,
      height: 400,
    });

    const newImage: JournalImage = {
      id: `sketch-${Date.now()}`,
      url: dataUrl,
      caption: `Field sketch: ${sketchPrompt.trim()}`,
      style: 'sketch',
      quality: sketchQuality,
      prompt: sketchPrompt.trim(),
      createdAt: Date.now(),
    };

    handleUpdateCurrentEntry({
      images: [...(selectedEntry.images || []), newImage],
    });

    setSketchPrompt('');
    setIsSketchDrawerOpen(false);
  };

  const handleRemoveImage = (imgId: string) => {
    if (!selectedEntry) return;
    handleUpdateCurrentEntry({
      images: (selectedEntry.images || []).filter((img) => img.id !== imgId),
    });
  };

  const isDark = theme === 'blueprint' || theme === 'mythweavers';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 md:p-6 overflow-hidden">
      <div
        className={`w-full max-w-6xl h-[92vh] rounded-xl flex flex-col shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-cyan-500/40 text-slate-100'
            : 'bg-[#faf6ee] border-amber-900/30 text-stone-900'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 select-none ${
            isDark ? 'bg-slate-950/80 border-cyan-500/30' : 'bg-[#f4ebe1] border-amber-800/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center border shadow-xs ${
                isDark ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300' : 'bg-amber-100 border-amber-700 text-amber-900'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg tracking-wide">
                  {character.name}’s Session Journal & Chronicle
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-semibold">
                  {entries.length} Entries
                </span>
              </div>
              <p className="text-xs opacity-75 font-serif">
                Session logs, recall notes, field pencil sketches, and in-character chronicles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAITool && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAITool('journal');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-colors"
                title="Open AI Companion to write in character voice"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Voice Writer</span>
              </button>
            )}

            <button
              onClick={handleCreateNewEntry}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Session Log</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 opacity-70" />
            </button>
          </div>
        </div>

        {/* Content Body: Two columns (List on Left, Detail/Editor on Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Entry List & Filters */}
          <div
            className={`w-80 md:w-96 border-r flex flex-col shrink-0 overflow-hidden ${
              isDark ? 'bg-slate-950/40 border-cyan-500/20' : 'bg-[#f7f1e6] border-amber-900/20'
            }`}
          >
            {/* Search and Tags */}
            <div className="p-3 border-b space-y-2 shrink-0 border-inherit">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-40" />
                <input
                  type="text"
                  placeholder="Search logs, notes, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded text-xs border outline-hidden transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-400'
                      : 'bg-white border-stone-300 text-stone-900 focus:border-amber-700'
                  }`}
                />
              </div>

              {allTags.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
                  <button
                    onClick={() => setSelectedTag('all')}
                    className={`px-2 py-0.5 rounded-full shrink-0 border transition-colors ${
                      selectedTag === 'all'
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'bg-black/5 dark:bg-white/5 border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(t)}
                      className={`px-2 py-0.5 rounded-full shrink-0 border transition-colors ${
                        selectedTag === t
                          ? 'bg-amber-700 text-white border-amber-700'
                          : 'bg-black/5 dark:bg-white/5 border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-inherit">
              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center text-xs opacity-50 font-serif">
                  No journal records found. Click &quot;New Session Log&quot; to begin your chronicle!
                </div>
              ) : (
                filteredEntries.map((e) => {
                  const isSelected = selectedEntry && selectedEntry.id === e.id;
                  return (
                    <div
                      key={e.id}
                      onClick={() => {
                        setSelectedEntryId(e.id);
                        setIsEditing(false);
                      }}
                      className={`p-3 cursor-pointer transition-colors select-none ${
                        isSelected
                          ? isDark
                            ? 'bg-cyan-950/60 border-l-4 border-l-cyan-400 text-cyan-100'
                            : 'bg-amber-100/80 border-l-4 border-l-amber-800 text-stone-950 font-medium'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-semibold opacity-70 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>{e.sessionDate}</span>
                        </span>
                        {e.images && e.images.length > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>{e.images.length}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif font-bold text-sm leading-snug line-clamp-1 mb-1">
                        {e.title}
                      </h4>

                      <p className="font-serif text-xs opacity-75 line-clamp-2 leading-relaxed mb-1.5">
                        {e.content}
                      </p>

                      <div className="flex items-center justify-between text-[10px] opacity-70">
                        {e.location ? (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                            <span className="truncate">{e.location}</span>
                          </span>
                        ) : (
                          <span />
                        )}
                        {e.recalledNotes && e.recalledNotes.length > 0 && (
                          <span className="font-mono text-amber-600 dark:text-amber-400">
                            {e.recalledNotes.length} recall notes
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Entry Reader & Editor */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-5">
            {selectedEntry ? (
              <>
                {/* Entry Meta Header */}
                <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-inherit">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        type="text"
                        value={selectedEntry.title}
                        onChange={(e) => handleUpdateCurrentEntry({ title: e.target.value })}
                        className={`text-xl font-serif font-bold w-full rounded px-2 py-1 border outline-hidden ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-300'
                        }`}
                      />
                    ) : (
                      <h3 className="text-2xl font-serif font-bold tracking-tight">
                        {selectedEntry.title}
                      </h3>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono opacity-80 mt-1.5">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="opacity-60">Session:</span>
                            <input
                              type="text"
                              value={selectedEntry.sessionDate}
                              onChange={(e) => handleUpdateCurrentEntry({ sessionDate: e.target.value })}
                              className="px-1.5 py-0.5 rounded border text-xs bg-transparent border-slate-600"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="opacity-60">Location:</span>
                            <input
                              type="text"
                              value={selectedEntry.location || ''}
                              onChange={(e) => handleUpdateCurrentEntry({ location: e.target.value })}
                              className="px-1.5 py-0.5 rounded border text-xs bg-transparent border-slate-600"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            <span>{selectedEntry.sessionDate}</span>
                          </span>
                          {selectedEntry.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              <span>{selectedEntry.location}</span>
                            </span>
                          )}
                          {selectedEntry.realDate && (
                            <span className="flex items-center gap-1 opacity-60">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Recorded: {selectedEntry.realDate}</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 transition-colors ${
                        isEditing
                          ? 'bg-amber-700 text-white border-amber-700'
                          : 'bg-black/5 dark:bg-white/5 border-inherit hover:opacity-100'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Done Editing' : 'Edit Text'}</span>
                    </button>

                    <button
                      onClick={() => setIsSketchDrawerOpen(!isSketchDrawerOpen)}
                      className="px-3 py-1.5 rounded text-xs font-mono font-semibold border border-amber-600/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 transition-colors"
                      title="Generate a hand-drawn pencil sketch directly into this log"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Pencil Sketch</span>
                    </button>

                    <button
                      onClick={() => handleDeleteEntry(selectedEntry.id)}
                      className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Pencil Sketch Generator Drawer */}
                {isSketchDrawerOpen && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isDark ? 'bg-slate-950 border-cyan-500/40' : 'bg-amber-50/90 border-amber-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-amber-600" />
                        <span className="font-serif font-bold text-sm">
                          Pencil Sketch Studio for Session Log
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        Graphite on Parchment
                      </span>
                    </div>

                    <p className="text-xs opacity-75 font-serif">
                      Create a graphite pencil field sketch to preserve alongside this entry. Quality
                      determines hatching density, paper grain, and shading refinement.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[11px] font-mono font-bold opacity-75 block">
                          Sketch Subject / Prompt:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kenabres citadel watchtower, Dragon skull carved in basalt, Ancient longsword relic..."
                          value={sketchPrompt}
                          onChange={(e) => setSketchPrompt(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded text-xs border outline-hidden ${
                            isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-amber-300'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono font-bold opacity-75 block">
                          Pencil Detail Quality:
                        </label>
                        <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                          {(['crude', 'passible', 'tasteful', 'astounding'] as SketchDetailQuality[]).map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setSketchQuality(q)}
                              className={`px-2 py-1 rounded capitalize border transition-all text-center ${
                                sketchQuality === q
                                  ? 'bg-amber-700 text-white border-amber-700 font-bold shadow-xs'
                                  : 'bg-black/5 dark:bg-white/5 border-inherit opacity-75 hover:opacity-100'
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setIsSketchDrawerOpen(false)}
                        className="px-3 py-1 rounded text-xs font-mono opacity-70 hover:opacity-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGeneratePencilSketch}
                        disabled={!sketchPrompt.trim()}
                        className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Draw & Attach Sketch</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Entry Narrative Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono opacity-75">
                    <span className="uppercase tracking-wider font-bold">Session Narrative</span>
                    <span>{selectedEntry.content.length} characters</span>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={12}
                      value={selectedEntry.content}
                      onChange={(e) => handleUpdateCurrentEntry({ content: e.target.value })}
                      placeholder="Write your session chronicles here..."
                      className={`w-full p-4 rounded-xl font-serif text-sm leading-relaxed border outline-hidden shadow-inner resize-y ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-amber-300 text-stone-900'
                      }`}
                    />
                  ) : (
                    <div
                      className={`p-5 rounded-xl font-serif text-sm leading-relaxed whitespace-pre-wrap border shadow-xs ${
                        isDark ? 'bg-slate-950/60 border-cyan-500/20' : 'bg-white/90 border-amber-900/15'
                      }`}
                    >
                      {selectedEntry.content}
                    </div>
                  )}
                </div>

                {/* Recalled Notes Section (Checklist & Reminders) */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-slate-950/40 border-cyan-500/20' : 'bg-[#f4efe4] border-amber-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-amber-600" />
                      <h4 className="font-serif font-bold text-sm">Recalled Notes & Campaign Clues</h4>
                    </div>
                    <span className="text-[10px] font-mono opacity-70">
                      Unresolved leads, NPC names & promises
                    </span>
                  </div>

                  {/* Note List */}
                  <div className="space-y-1.5">
                    {(!selectedEntry.recalledNotes || selectedEntry.recalledNotes.length === 0) && (
                      <p className="text-xs opacity-50 font-serif italic py-1">
                        No recalled notes logged for this session yet.
                      </p>
                    )}
                    {(selectedEntry.recalledNotes || []).map((note, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-xs font-serif flex items-start justify-between gap-2 transition-colors ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-200'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <CheckSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span className="leading-snug break-words">{note}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveRecalledNote(idx)}
                          className="opacity-50 hover:opacity-100 hover:text-rose-500 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add note input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add clue, debt, NPC contact or item to remember..."
                      value={newRecalledNoteText}
                      onChange={(e) => setNewRecalledNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddRecalledNote();
                      }}
                      className={`flex-1 px-3 py-1.5 rounded text-xs border outline-hidden ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-amber-300'
                      }`}
                    />
                    <button
                      onClick={handleAddRecalledNote}
                      disabled={!newRecalledNoteText.trim()}
                      className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors"
                    >
                      Add Note
                    </button>
                  </div>
                </div>

                {/* Attached Pencil Sketches & Illustrations Gallery */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <h4 className="font-serif font-bold text-sm">
                        Session Field Sketches & Imagery ({selectedEntry.images?.length || 0})
                      </h4>
                    </div>
                  </div>

                  {(!selectedEntry.images || selectedEntry.images.length === 0) ? (
                    <div
                      className={`p-6 rounded-xl border border-dashed text-center font-serif text-xs opacity-60 ${
                        isDark ? 'border-slate-800' : 'border-amber-900/20'
                      }`}
                    >
                      No illustrations attached to this record yet. Click &quot;Pencil Sketch&quot; above to
                      draw an authentic graphite sketch!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedEntry.images.map((img) => (
                        <div
                          key={img.id}
                          className={`rounded-xl border overflow-hidden shadow-sm flex flex-col ${
                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-amber-900/20'
                          }`}
                        >
                          <div className="relative group bg-black/10 overflow-hidden flex items-center justify-center max-h-60">
                            <img
                              src={img.url}
                              alt={img.caption || 'Session sketch'}
                              className="w-full h-auto object-contain max-h-60"
                            />
                            <button
                              onClick={() => handleRemoveImage(img.id)}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-md"
                              title="Remove image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {img.quality && (
                              <span className="absolute bottom-2 left-2 text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-900/85 text-amber-200 border border-amber-500/30 uppercase font-bold tracking-wider">
                                {img.quality} Detail
                              </span>
                            )}
                          </div>
                          {img.caption && (
                            <div className="p-2.5 font-serif text-xs italic border-t border-inherit opacity-85">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60 font-serif">
                <BookOpen className="w-12 h-12 mb-3 stroke-[1.5] text-amber-600" />
                <h3 className="text-lg font-bold">No Entry Selected</h3>
                <p className="text-xs max-w-sm mt-1">
                  Select a session chronicle from the list on the left or create a brand new log.
                </p>
                <button
                  onClick={handleCreateNewEntry}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-mono font-bold bg-amber-700 hover:bg-amber-600 text-white shadow-xs transition-colors"
                >
                  Create First Session Log
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
