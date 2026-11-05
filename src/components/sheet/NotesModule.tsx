import React, { useState } from 'react';
import {
  BookOpen,
  ChevronUp,
  ChevronDown,
  Clock,
  Copy,
  Check,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { PF1Character, RollupNotesData } from '../../types/character';

interface NotesModuleProps {
  character: PF1Character;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
}

export const NotesModule: React.FC<NotesModuleProps> = ({
  character,
  theme,
  fontClass,
  onUpdateCharacter,
}) => {
  const [copied, setCopied] = useState(false);

  const isParchment = theme === 'parchment';
  const isBlueprint = theme === 'blueprint';
  const isMythWeavers = theme === 'mythweavers';

  const cardBg = isParchment
    ? 'bg-amber-50/70 border-amber-800/20 text-stone-900 shadow-sm'
    : isBlueprint
    ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-50'
    : isMythWeavers
    ? 'bg-[#15171a] border-[#2d3139] text-slate-100'
    : 'bg-white border-black text-black';

  const headerBg = isParchment
    ? 'bg-amber-900/10 border-amber-900/20 text-amber-950 font-serif'
    : isBlueprint
    ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 font-mono'
    : isMythWeavers
    ? 'bg-[#0f1113] border-[#2d3139] text-amber-400 font-serif'
    : 'bg-neutral-100 border-black text-black font-sans';

  const inputStyle = isParchment
    ? 'bg-white/80 border-amber-900/30 text-stone-900 focus:border-amber-700 focus:bg-white'
    : isBlueprint
    ? 'bg-slate-950/80 border-cyan-700/60 text-cyan-200 focus:border-cyan-400'
    : isMythWeavers
    ? 'bg-[#0d0e10] border-[#383d47] text-amber-100 focus:border-amber-500'
    : 'bg-white border-neutral-400 text-black';

  const rollupNotes: RollupNotesData = character.rollupNotes || {
    content: '== Campaign Scratchpad & Session Log ==\n- Met with party in Kenabres\n- Purchased 2 healing potions\n- Prepared for undercity expedition',
    isRolledUp: false,
  };

  const isRolledUp = rollupNotes.isRolledUp;

  const toggleRollup = () => {
    onUpdateCharacter((prev) => ({
      ...prev,
      rollupNotes: {
        ...(prev.rollupNotes || rollupNotes),
        isRolledUp: !isRolledUp,
      },
    }));
  };

  const handleContentChange = (newContent: string) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      rollupNotes: {
        ...(prev.rollupNotes || rollupNotes),
        content: newContent,
      },
    }));
  };

  const handleInsertTimestamp = () => {
    const timestamp = `\n[Session Log: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]\n- `;
    handleContentChange(rollupNotes.content + timestamp);
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(rollupNotes.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearNotes = () => {
    if (confirm('Clear scratchpad notes?')) {
      handleContentChange('');
    }
  };

  const wordCount = rollupNotes.content.trim() ? rollupNotes.content.trim().split(/\s+/).length : 0;
  const lineCount = rollupNotes.content.split('\n').length;

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${cardBg} ${fontClass}`}>
      {/* Roll-up Bar Header */}
      <div
        onClick={toggleRollup}
        className={`px-3 py-2 flex items-center justify-between cursor-pointer select-none transition-colors ${headerBg} ${
          !isRolledUp ? 'border-b' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span className="font-bold uppercase text-xs tracking-wider">
            Roll-Up Notes & Scratchpad
          </span>
          <span className="text-[10px] font-mono opacity-70">
            ({wordCount} words, {lineCount} lines)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-current opacity-70">
            {isRolledUp ? 'Rolled Up' : 'Expanded'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRollup();
            }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title={isRolledUp ? 'Unroll notes' : 'Roll up notes into a single bar'}
          >
            {isRolledUp ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Unrolled Scratchpad Body */}
      {!isRolledUp && (
        <div className="p-3 space-y-2">
          {/* Quick Actions Toolbar */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleInsertTimestamp}
                className="px-2 py-1 rounded border border-slate-700/60 hover:border-cyan-400 text-cyan-300 flex items-center gap-1 transition-colors text-[11px]"
              >
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Timestamp</span>
              </button>
              <button
                onClick={handleCopyNotes}
                className="px-2 py-1 rounded border border-slate-700/60 hover:border-cyan-400 text-slate-300 flex items-center gap-1 transition-colors text-[11px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={handleClearNotes}
              className="px-2 py-1 rounded border border-slate-700/60 hover:border-rose-500 text-rose-400 flex items-center gap-1 transition-colors text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          {/* Resizable Scratchpad Textarea */}
          <textarea
            value={rollupNotes.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Type session logs, GM clues, monster notes, or equations here... This area auto-saves and can roll up into a single bar whenever needed."
            rows={8}
            className={`w-full p-2.5 rounded-lg text-xs leading-relaxed resize-y min-h-[160px] font-mono ${inputStyle}`}
          />
        </div>
      )}
    </div>
  );
};
