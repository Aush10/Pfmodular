import React, { useState } from 'react';
import {
  X,
  Swords,
  Shield,
  Dices,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  Hand,
  Activity,
  Zap,
} from 'lucide-react';
import { PF1Character } from '../../types/character';
import { DerivedCombatStats } from '../../engine/pf1eMath';

interface CMBToolProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  derived: DerivedCombatStats;
  theme: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onRollFormula: (formula: string, label?: string) => void;
}

export type ManeuverKey =
  | 'grapple'
  | 'bullrush'
  | 'dirtytrick'
  | 'disarm'
  | 'drag'
  | 'overrun'
  | 'reposition'
  | 'steal'
  | 'sunder'
  | 'trip'
  | 'feint';

export const CMBTool: React.FC<CMBToolProps> = ({
  isOpen,
  onClose,
  character,
  derived,
  theme,
  onUpdateCharacter,
  onRollFormula,
}) => {
  const [activeTab, setActiveTab] = useState<'grapple' | 'allManeuvers' | 'flowchart'>('grapple');
  const [selectedManeuver, setSelectedManeuver] = useState<ManeuverKey>('grapple');

  // Grapple Track State (2 Sliders)
  // Slider 1: Player Position in Grapple (0 to 7)
  // 0: Free / Ready to Initiate
  // 1: Initiator (Control, Just Grappled)
  // 2: Maintaining Hold (Round 2+, +5 Circumstance)
  // 3: Target is Pinned by You
  // 4: Target is Tied Up (Helpless)
  // 5: Grappled by Opponent (Defender)
  // 6: Pinned by Opponent (Defender)
  // 7: Tied Up by Opponent (Helpless)
  const [myPosition, setMyPosition] = useState<number>(0);

  // Slider 2: Opponent's Condition (0 to 3)
  // 0: Free / Normal
  // 1: Grappled
  // 2: Pinned
  // 3: Tied Up / Helpless
  const [opponentState, setOpponentState] = useState<number>(0);

  // Grapple Check Modifiers & Toggles
  const [hasImprovedGrapple, setHasImprovedGrapple] = useState<boolean>(false);
  const [hasGreaterGrapple, setHasGreaterGrapple] = useState<boolean>(false);
  const [hasGrabAbility, setHasGrabAbility] = useState<boolean>(false);
  const [lessThanTwoHands, setLessThanTwoHands] = useState<boolean>(false);
  const [assistingAlliesCount, setAssistingAlliesCount] = useState<number>(0);
  const [tieUpUnpinnedPenalty, setTieUpUnpinnedPenalty] = useState<boolean>(false);
  const [targetCmdInput, setTargetCmdInput] = useState<number>(20);
  const [lastGrappleRollResult, setLastGrappleRollResult] = useState<{
    roll: number;
    total: number;
    targetCmd: number;
    success: boolean;
    margin: number;
  } | null>(null);

  // Other Maneuver Check State
  const [maneuverFeatBonus, setManeuverFeatBonus] = useState<number>(0);
  const [maneuverMiscBonus, setManeuverMiscBonus] = useState<number>(0);
  const [maneuverTargetCmd, setManeuverTargetCmd] = useState<number>(20);
  const [lastManeuverRollResult, setLastManeuverRollResult] = useState<{
    roll: number;
    total: number;
    targetCmd: number;
    success: boolean;
    margin: number;
  } | null>(null);

  if (!isOpen) return null;

  // Calculate situational grapple bonus for current player position
  const isMaintaining = myPosition === 2;
  const isPinning = myPosition === 3;
  const isTargetTiedUp = myPosition === 4;
  const isGrappledByOpponent = myPosition === 5;
  const isPinnedByOpponent = myPosition === 6;
  const isTiedUpByOpponent = myPosition === 7;

  // Automatic situational grapple bonus
  let situationGrappleBonus = 0;
  if (isMaintaining) situationGrappleBonus += 5; // +5 circumstance to maintain
  if (hasImprovedGrapple) situationGrappleBonus += 2;
  if (hasGreaterGrapple) situationGrappleBonus += 2;
  if (hasGrabAbility) situationGrappleBonus += 4;
  if (lessThanTwoHands) situationGrappleBonus -= 4;
  if (assistingAlliesCount > 0) situationGrappleBonus += assistingAlliesCount * 2;
  if (tieUpUnpinnedPenalty) situationGrappleBonus -= 10;

  // If the player is currently grappled or pinned by an opponent, their normal CMB takes -2
  const grappleConditionPenalty = isGrappledByOpponent || isPinnedByOpponent ? 0 : 0; // Escape checks don't take the -2 penalty per rules!
  const totalGrappleMod = derived.cmbTotal + situationGrappleBonus - grappleConditionPenalty;

  // Execute Grapple Check Roll
  const handleRollGrappleCheck = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + totalGrappleMod;
    const isSuccess = d20 === 20 || (d20 !== 1 && total >= targetCmdInput);
    const margin = total - targetCmdInput;

    setLastGrappleRollResult({
      roll: d20,
      total,
      targetCmd: targetCmdInput,
      success: isSuccess,
      margin,
    });

    const label = isMaintaining
      ? 'Grapple Maintain Check (+5 Circumstance)'
      : isGrappledByOpponent
      ? 'Escape / Reverse Grapple Check'
      : isPinning
      ? 'Maintain Pin / Action Check'
      : 'Grapple Combat Maneuver Check';

    onRollFormula(`1d20+${totalGrappleMod}`, label);
  };

  // Execute General Maneuver Roll
  const totalOtherManeuverMod = derived.cmbTotal + maneuverFeatBonus + maneuverMiscBonus;
  const handleRollOtherManeuver = (name: string) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + totalOtherManeuverMod;
    const isSuccess = d20 === 20 || (d20 !== 1 && total >= maneuverTargetCmd);
    const margin = total - maneuverTargetCmd;

    setLastManeuverRollResult({
      roll: d20,
      total,
      targetCmd: maneuverTargetCmd,
      success: isSuccess,
      margin,
    });

    onRollFormula(`1d20+${totalOtherManeuverMod}`, `${name} Maneuver Check vs CMD ${maneuverTargetCmd}`);
  };

  // Sync Debuffs with Character
  const handleApplyDebuffsToCharacter = () => {
    onUpdateCharacter((prev) => {
      const nextConditions = { ...prev.conditions };
      if (isGrappledByOpponent || myPosition === 1 || myPosition === 2) {
        nextConditions.grappled = true;
        nextConditions.pinned = false;
      } else if (isPinnedByOpponent || opponentState === 2) {
        nextConditions.pinned = true;
        nextConditions.grappled = true;
      } else if (myPosition === 0) {
        nextConditions.grappled = false;
        nextConditions.pinned = false;
      }

      return {
        ...prev,
        conditions: nextConditions,
      };
    });
  };

  const handleClearDebuffs = () => {
    setMyPosition(0);
    setOpponentState(0);
    onUpdateCharacter((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        grappled: false,
        pinned: false,
      },
    }));
  };

  // Position Labels
  const positionLabels = [
    '0. Free (Ready to Initiate)',
    '1. Initiator (Just Grappled)',
    '2. Maintaining Hold (Round 2+, +5 Bonus)',
    '3. You are Pinning Target (Lose Dex to AC)',
    '4. Target is Tied Up (Helpless)',
    '5. Grappled by Opponent (Defender)',
    '6. Pinned by Opponent (Defender)',
    '7. Tied Up by Opponent (Helpless)',
  ];

  const opponentLabels = [
    '0. Normal / Free',
    '1. Grappled (-4 Dex, -2 Atk/CMB, Speed 0)',
    '2. Pinned (No Dex to AC, -4 AC, No Move)',
    '3. Tied Up / Helpless (Dex 0/-5 mod, Melee +4)',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-xl bg-slate-900 border border-amber-500/40 text-slate-100 shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-400">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-amber-300">
                  CMBt: Combat Maneuvers & Grapple Track
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Base CMB: {derived.cmbTotal >= 0 ? `+${derived.cmbTotal}` : derived.cmbTotal}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  CMD: {derived.cmdTotal}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live grapple condition tracker, interactive dual-slider state machine, and complete maneuvers reference.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('grapple')}
            className={`px-3 py-1.5 rounded-t font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'grapple'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hand className="w-3.5 h-3.5 text-amber-400" />
            <span>Grapple Track</span>
          </button>
          <button
            onClick={() => setActiveTab('allManeuvers')}
            className={`px-3 py-1.5 rounded-t font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'allManeuvers'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-cyan-400" />
            <span>All Combat Maneuvers</span>
          </button>
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`px-3 py-1.5 rounded-t font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'flowchart'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Grapple Flowchart Rules</span>
          </button>
        </div>

        {/* Tab 1: Grapple Track (The Main Feature) */}
        {activeTab === 'grapple' && (
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {/* Top Sliders Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                  <Hand className="w-4 h-4 text-amber-400" />
                  <span>Grapple State Machine (2 Adjustable Position Sliders)</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyDebuffsToCharacter}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 shadow-sm"
                    title="Apply the current grappled/pinned state and penalties to character sheet conditions"
                  >
                    <Check className="w-3 h-3" />
                    <span>Apply to Sheet</span>
                  </button>
                  <button
                    onClick={handleClearDebuffs}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1"
                    title="Release grapple and clear all debuffs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Release</span>
                  </button>
                </div>
              </div>

              {/* Slider 1: My Position in Grapple */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-300">
                    Slider 1: Your Role & Position:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {positionLabels[myPosition]}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  step="1"
                  value={myPosition}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setMyPosition(val);
                    // Smart auto-update opponent state
                    if (val === 1 || val === 2) setOpponentState(1);
                    else if (val === 3) setOpponentState(2);
                    else if (val === 4) setOpponentState(3);
                    else if (val === 0) setOpponentState(0);
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="grid grid-cols-4 sm:grid-cols-8 text-[9px] font-mono text-slate-500 text-center gap-1">
                  <span>0. Free</span>
                  <span>1. Initiate</span>
                  <span>2. Maintain</span>
                  <span>3. Pinning</span>
                  <span>4. Tied Up</span>
                  <span>5. Defend</span>
                  <span>6. Pinned</span>
                  <span>7. Helpless</span>
                </div>
              </div>

              {/* Slider 2: Opponent's Condition */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-300">
                    Slider 2: Opponent&apos;s Condition:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    {opponentLabels[opponentState]}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={opponentState}
                  onChange={(e) => setOpponentState(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="grid grid-cols-4 text-[10px] font-mono text-slate-500 text-center">
                  <span>0. Normal</span>
                  <span>1. Grappled</span>
                  <span>2. Pinned</span>
                  <span>3. Tied Up</span>
                </div>
              </div>
            </div>

            {/* Middle Grid: Tactical Action Matrix & Make Check Generator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column (7 cols): Available Moves & Action Economy */}
              <div className="lg:col-span-7 space-y-3">
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Permitted Moves For Current Position</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Standard Action (or Move w/ Greater Grapple)
                    </span>
                  </div>

                  {/* Moves List Based on Position */}
                  {(myPosition === 0 || myPosition === 1 || myPosition === 2) && (
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded bg-slate-900 border border-amber-500/30 space-y-1">
                        <div className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-amber-400" />
                          <span>Maintain Grapple (Roll CMB vs Opponent CMD)</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          {isMaintaining
                            ? 'You receive a +5 circumstance bonus on this check because target did not break the hold!'
                            : 'Standard action to initiate or continue the hold. If successful, choose ONE of the following:'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-cyan-300">1. Damage</div>
                          <div className="text-[11px] text-slate-400">
                            Deal damage equal to unarmed strike, natural attack, armor spikes, or light/one-handed weapon (lethal or nonlethal).
                          </div>
                        </div>
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-emerald-300">2. Move</div>
                          <div className="text-[11px] text-slate-400">
                            Move self and target up to half speed. Place target in any adjacent square (hazardous square grants target free escape at +4).
                          </div>
                        </div>
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-amber-300">3. Pin</div>
                          <div className="text-[11px] text-slate-400">
                            Give target Pinned condition. You keep grappled condition but lose your Dex bonus to AC.
                          </div>
                        </div>
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-purple-300">4. Tie Up</div>
                          <div className="text-[11px] text-slate-400">
                            If target is pinned or restrained, DC to escape is 20 + your CMB. If grappling unpinned, takes -10 penalty.
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Release Hold: Free Action (removes grappled condition from both).</span>
                        <span className="font-mono text-cyan-400">Free Action</span>
                      </div>
                    </div>
                  )}

                  {myPosition === 3 && (
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded bg-slate-900 border border-purple-500/30 space-y-1">
                        <div className="font-bold text-purple-300">You have Opponent Pinned!</div>
                        <p className="text-[11px] text-slate-300">
                          Opponent is denied Dex to AC and has -4 AC penalty. You only have the grappled condition, but lose Dex to AC.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-cyan-300">Tie Up in Ropes</div>
                          <div className="text-[11px] text-slate-400">
                            Since opponent is pinned, no -10 penalty! DC to escape ropes is 20 + your CMB.
                          </div>
                        </div>
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-amber-300">Damage or Move</div>
                          <div className="text-[11px] text-slate-400">
                            Maintain check to deal unarmed/light damage or move up to half speed with target.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(myPosition === 5 || myPosition === 6) && (
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 space-y-1">
                        <div className="font-bold text-rose-300">
                          {myPosition === 6 ? 'You are PINNED by Opponent' : 'You are GRAPPLED by Opponent'}
                        </div>
                        <p className="text-[11px] text-rose-200/90">
                          {myPosition === 6
                            ? 'Denied Dex bonus, -4 AC penalty, cannot move. Can only take verbal/mental actions or attempt escape.'
                            : 'Cannot move, -4 Dex penalty (-2 mod), -2 on attack & CMB rolls. Can take no 2-handed actions.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-emerald-300">Break Free</div>
                          <div className="text-[11px] text-slate-400">
                            Standard action CMB or Escape Artist check vs Opponent CMD. If successful, both lose grappled condition!
                          </div>
                        </div>
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-amber-300">Take Control (Reverse)</div>
                          <div className="text-[11px] text-slate-400">
                            Standard action CMB check vs Opponent CMD. If successful, YOU become controlling grappler with +5 next round!
                          </div>
                        </div>
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-cyan-300">Light / 1-Handed Attack</div>
                          <div className="text-[11px] text-slate-400">
                            Attack with light or one-handed weapon (at -2 penalty to hit). Cannot be taken if pinned!
                          </div>
                        </div>
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-purple-300">Cast Spell (Concentration)</div>
                          <div className="text-[11px] text-slate-400">
                            No somatic components. DC = 10 + Grappler&apos;s CMB + Spell Level or spell is lost.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {myPosition === 4 && (
                    <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-xs space-y-1">
                      <div className="font-bold text-emerald-300">Opponent is Bound / Tied Up!</div>
                      <p className="text-[11px] text-slate-300">
                        Target has the Helpless condition (treated as Dex 0 / -5 mod). Melee attacks have +4 bonus. Eligible for coup de grace. Escape DC = 20 + your CMB.
                      </p>
                    </div>
                  )}

                  {myPosition === 7 && (
                    <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/60 text-xs space-y-1">
                      <div className="font-bold text-rose-300">You are Tied Up (Helpless)!</div>
                      <p className="text-[11px] text-rose-200">
                        Treated as Dex 0 (-5 modifier). Melee attacks against you gain +4. Escape DC = 20 + Grappler&apos;s CMB. If DC &gt; 20 + your CMB, escape is impossible even on Nat 20.
                      </p>
                    </div>
                  )}
                </div>

                {/* Active Penalties Calculation Callout */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-2">
                  <div className="font-bold text-slate-300 uppercase text-[11px] flex items-center justify-between">
                    <span>Active Grapple Penalties on Character:</span>
                    <span className="text-amber-400 font-bold">
                      {isGrappledByOpponent
                        ? '-4 DEX (-2 ASB), -2 Attacks, Speed 0'
                        : isPinnedByOpponent
                        ? '-4 AC, Denied Dex to AC, Speed 0'
                        : isPinning
                        ? 'Loses Dex to AC (Pinning)'
                        : 'None Active'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">
                    Humanoids without two free hands take a -4 penalty on grapple checks. A grappled creature cannot take Attacks of Opportunity or two-handed actions.
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Make Check Button & Modifier Config */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-3.5 rounded-lg bg-slate-950 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1">
                      <Dices className="w-4 h-4 text-amber-400" />
                      <span>Make Grapple Check</span>
                    </span>
                    <span className="font-mono font-bold text-sm text-amber-400">
                      Mod: {totalGrappleMod >= 0 ? `+${totalGrappleMod}` : totalGrappleMod}
                    </span>
                  </div>

                  {/* Target Opponent CMD Input */}
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs font-mono">
                    <span className="text-slate-300 font-bold">Target Opponent CMD:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="80"
                        value={targetCmdInput}
                        onChange={(e) => setTargetCmdInput(parseInt(e.target.value, 10) || 10)}
                        className="w-14 text-center py-0.5 rounded bg-slate-950 border border-slate-700 font-bold text-cyan-300"
                      />
                    </div>
                  </div>

                  {/* Situational Checkboxes */}
                  <div className="space-y-1.5 text-xs font-mono bg-slate-900/60 p-2 rounded border border-slate-800/80">
                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">
                      Check Modifiers:
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={isMaintaining}
                        onChange={(e) => setMyPosition(e.target.checked ? 2 : 1)}
                        className="rounded text-amber-500"
                      />
                      <span>Maintaining Hold (+5 Circumstance)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={hasImprovedGrapple}
                        onChange={(e) => setHasImprovedGrapple(e.target.checked)}
                        className="rounded text-amber-500"
                      />
                      <span>Improved Grapple Feat (+2, No AoO)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={hasGreaterGrapple}
                        onChange={(e) => setHasGreaterGrapple(e.target.checked)}
                        className="rounded text-amber-500"
                      />
                      <span>Greater Grapple Feat (+2, Move Action)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={hasGrabAbility}
                        onChange={(e) => setHasGrabAbility(e.target.checked)}
                        className="rounded text-amber-500"
                      />
                      <span>Grab Monster Ability (+4, No AoO)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={lessThanTwoHands}
                        onChange={(e) => setLessThanTwoHands(e.target.checked)}
                        className="rounded text-rose-500"
                      />
                      <span className="text-rose-300">Less Than Two Hands Free (-4 Penalty)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={tieUpUnpinnedPenalty}
                        onChange={(e) => setTieUpUnpinnedPenalty(e.target.checked)}
                        className="rounded text-rose-500"
                      />
                      <span className="text-rose-300">Tie Up Unpinned Target (-10 Penalty)</span>
                    </label>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <span className="text-[11px] text-slate-300">Aiding Allies (+2 each):</span>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={assistingAlliesCount}
                        onChange={(e) => setAssistingAlliesCount(parseInt(e.target.value, 10) || 0)}
                        className="w-10 text-center py-0.5 rounded bg-slate-950 border border-slate-700 text-xs"
                      />
                    </div>
                  </div>

                  {/* Make Check Button */}
                  <button
                    onClick={handleRollGrappleCheck}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-mono font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
                  >
                    <Dices className="w-4 h-4" />
                    <span>Roll Grapple Check (1d20 + {totalGrappleMod})</span>
                  </button>

                  {/* Last Roll Result Display */}
                  {lastGrappleRollResult && (
                    <div
                      className={`p-3 rounded-lg border text-center font-mono space-y-1 transition-all ${
                        lastGrappleRollResult.success
                          ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      <div className="text-xs uppercase font-bold flex items-center justify-center gap-1.5">
                        {lastGrappleRollResult.success ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Grapple Success!</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span>Grapple Failed</span>
                          </>
                        )}
                      </div>
                      <div className="text-lg font-black">
                        Total {lastGrappleRollResult.total}{' '}
                        <span className="text-xs font-normal opacity-80">
                          (d20: {lastGrappleRollResult.roll} + {totalGrappleMod}) vs CMD {lastGrappleRollResult.targetCmd}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-90">
                        {lastGrappleRollResult.success
                          ? isMaintaining
                            ? 'Hold maintained! Select your action: Damage, Move, Pin, or Tie Up.'
                            : isGrappledByOpponent
                            ? 'You broke free or reversed the grapple!'
                            : 'Grapple established! Both parties are now grappled.'
                          : 'Grapple check did not beat CMD. See flowchart for resolution.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: All Other Combat Maneuvers */}
        {activeTab === 'allManeuvers' && (
          <div className="p-4 flex-1 overflow-y-auto space-y-4 font-mono">
            {/* Maneuver Selector Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-slate-800">
              {(
                [
                  { key: 'bullrush', label: 'Bull Rush' },
                  { key: 'dirtytrick', label: 'Dirty Trick' },
                  { key: 'disarm', label: 'Disarm' },
                  { key: 'drag', label: 'Drag' },
                  { key: 'grapple', label: 'Grapple' },
                  { key: 'overrun', label: 'Overrun' },
                  { key: 'reposition', label: 'Reposition' },
                  { key: 'steal', label: 'Steal' },
                  { key: 'sunder', label: 'Sunder' },
                  { key: 'trip', label: 'Trip' },
                  { key: 'feint', label: 'Feint' },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setSelectedManeuver(m.key);
                    setLastManeuverRollResult(null);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    selectedManeuver === m.key
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Maneuver Details Card & Live Check Tool */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-sans">
              {/* Left Column: Rules & Effects */}
              <div className="lg:col-span-7 space-y-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold font-mono text-base text-cyan-300 uppercase">
                      {selectedManeuver.toUpperCase()} MANEUVER
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                      Base CMB: +{derived.cmbTotal}
                    </span>
                  </div>

                  {selectedManeuver === 'bullrush' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> Standard action or as part of a charge (in place of melee attack). Only against foes up to one size category larger.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Provokes AoO:</strong> Yes, unless you have Improved Bull Rush.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> Target pushed back 5 feet. For every 5 by which your attack exceeds opponent&apos;s CMD, push an additional 5 feet! You can move with the target if you have movement available.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Collisions:</strong> If another creature is behind the target, make an immediate check at -4 per creature beyond the first.
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'dirtytrick' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> Standard action. Covers kicking sand, pantsing, or hitting sensitive spots.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Provokes AoO:</strong> Yes, unless you have Improved Dirty Trick.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> Target gains ONE condition: <em>blinded, dazzled, deafened, entangled, shaken, or sickened</em> for 1 round, +1 round for every 5 by which your roll exceeds CMD!
                      </p>
                      <p>
                        <strong className="text-cyan-300">Removal:</strong> Target can remove the condition by spending a move action (standard action if you have Greater Dirty Trick).
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'disarm' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> In place of a melee attack (can be made multiple times during a full attack!).
                      </p>
                      <p>
                        <strong className="text-cyan-300">Provokes AoO:</strong> Yes, unless you have Improved Disarm. Unarmed disarm attempts take a -4 penalty.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> Target drops one held item of your choice.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Critical Success (Exceeds CMD by 10+):</strong> Target drops items held in BOTH hands!
                      </p>
                      <p className="text-rose-400">
                        <strong>Critical Failure (Fails by 10+):</strong> You drop the weapon you were using to attempt the disarm.
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'drag' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> Standard action. Pull target behind you in a straight line without harm.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> Target moved 5 feet back (into your space, you move back 5 ft). For every 5 over CMD, drag an additional 5 feet.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Stability:</strong> Dwarves and creatures with Stability racial traits add bonuses to CMD vs drag.
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'overrun' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> Standard action during move or as part of a charge. Move through target&apos;s square.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Avoid:</strong> Target can choose to avoid you, letting you pass without roll.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> You move through target&apos;s space. If you exceed CMD by 5 or more, target is knocked PRONE!
                      </p>
                      <p>
                        <strong className="text-cyan-300">More than Two Legs:</strong> +2 to target&apos;s CMD for each leg beyond two.
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'reposition' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> Standard action. Move a foe up to one size larger into a new position in reach.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> Move target 5 feet, +5 feet for every 5 by which attack exceeds CMD. Cannot move foe into intrinsically dangerous spaces (pits, walls of fire).
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'steal' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> Standard action. Must have at least one hand free (or use whip at -4).
                      </p>
                      <p>
                        <strong className="text-cyan-300">Eligible Items:</strong> Items loosely attached (belt pouch, brooches, necklaces). Fastened items give opponent +5 or greater CMD. Cannot steal closely worn armor or weapons held in hands (use disarm).
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'sunder' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> In place of a melee attack.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> Deal weapon damage normally to held/worn item. Damage exceeding Hardness reduces item HP.
                      </p>
                      <p>
                        <strong className="text-cyan-300">Broken Condition:</strong> At 50% HP or less, the item gains the Broken condition. At 0 HP, choose to destroy it or leave with 1 HP broken.
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'trip' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> In place of a melee attack (can use any weapon or unarmed strike!).
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> Target is knocked PRONE!
                      </p>
                      <p className="text-rose-400">
                        <strong>Critical Failure (Fails by 10+):</strong> YOU are knocked prone instead! (If using a Trip weapon, you can drop the weapon instead of falling prone).
                      </p>
                      <p>
                        <strong className="text-cyan-300">Immunities:</strong> Flying creatures, oozes, and creatures without legs cannot be tripped. +2 CMD per leg beyond two.
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'feint' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Action:</strong> Standard action (Move action with Improved Feint). Uses Bluff skill!
                      </p>
                      <p>
                        <strong className="text-cyan-300">DC:</strong> 10 + opponent BAB + Wisdom mod (or 10 + Sense Motive if higher).
                      </p>
                      <p>
                        <strong className="text-cyan-300">Success Effect:</strong> Target loses Dexterity bonus to AC against your next melee attack (made on or before your next turn).
                      </p>
                    </div>
                  )}

                  {selectedManeuver === 'grapple' && (
                    <div className="space-y-2 text-slate-300 leading-relaxed text-xs font-sans">
                      <p>
                        <strong className="text-cyan-300">Grapple Overview:</strong> Standard action to initiate. Both parties gain Grappled condition. Maintain each round as standard action (+5 bonus on subsequent rounds). On maintain, choose: Damage, Move, Pin, or Tie Up.
                      </p>
                      <p className="text-amber-400">
                        Switch to the &ldquo;Grapple Track&rdquo; tab above for the live state machine and interactive flow!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Maneuver Roller & Target CMD Comparison */}
              <div className="lg:col-span-5 space-y-3 font-mono">
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase">
                      Roll {selectedManeuver.toUpperCase()}
                    </span>
                    <span className="font-bold text-cyan-400">
                      Mod: {totalOtherManeuverMod >= 0 ? `+${totalOtherManeuverMod}` : totalOtherManeuverMod}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-300">Target CMD:</span>
                      <input
                        type="number"
                        min="1"
                        max="80"
                        value={maneuverTargetCmd}
                        onChange={(e) => setManeuverTargetCmd(parseInt(e.target.value, 10) || 10)}
                        className="w-14 text-center py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-300">Feat Bonus (e.g. +2/+4):</span>
                      <input
                        type="number"
                        value={maneuverFeatBonus}
                        onChange={(e) => setManeuverFeatBonus(parseInt(e.target.value, 10) || 0)}
                        className="w-14 text-center py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-300">Misc / Spell / Weapon Bonus:</span>
                      <input
                        type="number"
                        value={maneuverMiscBonus}
                        onChange={(e) => setManeuverMiscBonus(parseInt(e.target.value, 10) || 0)}
                        className="w-14 text-center py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleRollOtherManeuver(selectedManeuver.toUpperCase())}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
                  >
                    <Dices className="w-4 h-4" />
                    <span>Roll {selectedManeuver.toUpperCase()} (1d20 + {totalOtherManeuverMod})</span>
                  </button>

                  {/* Roll Result Display */}
                  {lastManeuverRollResult && (
                    <div
                      className={`p-3 rounded-lg border text-center space-y-1 transition-all ${
                        lastManeuverRollResult.success
                          ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      <div className="text-xs uppercase font-bold flex items-center justify-center gap-1.5">
                        {lastManeuverRollResult.success ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Maneuver Succeeded!</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span>Maneuver Failed</span>
                          </>
                        )}
                      </div>
                      <div className="text-lg font-black">
                        Total {lastManeuverRollResult.total}{' '}
                        <span className="text-xs font-normal opacity-80">
                          (d20: {lastManeuverRollResult.roll} + {totalOtherManeuverMod}) vs CMD {lastManeuverRollResult.targetCmd}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-90 font-sans">
                        {lastManeuverRollResult.success ? (
                          <>
                            Exceeds CMD by <strong>+{lastManeuverRollResult.margin}</strong>.
                            {selectedManeuver === 'bullrush' && (
                              <span className="block text-cyan-300 font-bold mt-0.5">
                                Pushes target {5 + Math.floor(lastManeuverRollResult.margin / 5) * 5} feet!
                              </span>
                            )}
                            {selectedManeuver === 'dirtytrick' && (
                              <span className="block text-cyan-300 font-bold mt-0.5">
                                Condition lasts {1 + Math.floor(lastManeuverRollResult.margin / 5)} rounds!
                              </span>
                            )}
                            {selectedManeuver === 'disarm' && lastManeuverRollResult.margin >= 10 && (
                              <span className="block text-cyan-300 font-bold mt-0.5">
                                Exceeded by 10+! Target drops items in BOTH hands!
                              </span>
                            )}
                            {selectedManeuver === 'trip' && (
                              <span className="block text-emerald-300 font-bold mt-0.5">
                                Target is knocked PRONE!
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            Failed by {Math.abs(lastManeuverRollResult.margin)}.
                            {selectedManeuver === 'trip' && lastManeuverRollResult.margin <= -10 && (
                              <span className="block text-rose-400 font-bold mt-0.5">
                                Failed by 10+! YOU are knocked prone instead!
                              </span>
                            )}
                            {selectedManeuver === 'disarm' && lastManeuverRollResult.margin <= -10 && (
                              <span className="block text-rose-400 font-bold mt-0.5">
                                Failed by 10+! You drop your own weapon!
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Grapple Flowchart Rules View */}
        {activeTab === 'flowchart' && (
          <div className="p-4 flex-1 overflow-y-auto space-y-4 font-sans text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold font-mono text-sm text-emerald-300 uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Pathfinder Grapple Flowchart Steps & Rules Reference</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ver 1.0 PF1e Core</span>
              </div>

              {/* Step by Step Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Round 1 */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="font-bold font-mono text-xs text-amber-300 uppercase border-b border-slate-800 pb-1">
                    Round 1: Attacker Turn
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4">
                    <li>Attacker initiates Grapple as a <strong>Standard Action</strong>.</li>
                    <li>
                      <strong>Attack of Opportunity:</strong> Provokes AoO unless attacker has Improved Grapple, Grab ability, etc.
                    </li>
                    <li>If hit by AoO, damage dealt becomes a penalty to the Grapple roll.</li>
                    <li>Attacker rolls <strong>CMB vs Defender&apos;s CMD</strong>.</li>
                    <li>
                      <strong>If Success:</strong> Both gain Grappled condition. Move defender to adjacent open square. Attacker gets <strong>+5 to maintain</strong> on next round!
                    </li>
                  </ul>
                </div>

                {/* Round 2 */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="font-bold font-mono text-xs text-cyan-300 uppercase border-b border-slate-800 pb-1">
                    Round 2: Defender Turn
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4">
                    <li>
                      <strong>Break Free (Standard):</strong> CMB or Escape Artist vs Attacker CMD. Success = both free.
                    </li>
                    <li>
                      <strong>Take Control (Standard):</strong> CMB vs Attacker CMD. Success = Defender is now controlling grappler and gets +5 next round!
                    </li>
                    <li>
                      <strong>Act with 1 Hand:</strong> Attack with light/1-handed weapon at -2 penalty, or cast spell with no somatic components (Concentration DC 10 + Attacker CMB + Spell Level).
                    </li>
                  </ul>
                </div>

                {/* Round 3 */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="font-bold font-mono text-xs text-purple-300 uppercase border-b border-slate-800 pb-1">
                    Round 3+: Attacker Turn
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4">
                    <li>
                      Roll <strong>CMB + 5 vs Defender CMD</strong> to Maintain.
                    </li>
                    <li>
                      <strong>Release:</strong> Free Action at any time during turn.
                    </li>
                    <li>
                      <strong>On Success, pick ONE:</strong>
                      <ul className="list-circle pl-3 pt-1 space-y-0.5 text-slate-400">
                        <li><strong>Damage:</strong> Unarmed, natural, or light weapon damage.</li>
                        <li><strong>Move:</strong> Move both up to 1/2 speed.</li>
                        <li><strong>Pin:</strong> Give Defender Pinned condition (Attacker loses Dex to AC).</li>
                        <li><strong>Tie Up:</strong> Use rope to bind target (DC 20 + Attacker CMB to escape).</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>

              {/* General Conditions Reference */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
                  <div className="font-bold font-mono text-amber-300">Grappled Condition:</div>
                  <div className="text-slate-400 space-y-0.5">
                    <div>-4 Dexterity penalty (-2 mod)</div>
                    <div>-2 on attack rolls and CMB checks (except grapple/escape)</div>
                    <div>Cannot move; speed is 0</div>
                    <div>Cannot take two-handed actions</div>
                    <div>Cannot take Attacks of Opportunity</div>
                    <div>Concentration check: DC 10 + Grappler CMB + Spell Lvl</div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
                  <div className="font-bold font-mono text-purple-300">Pinned Condition:</div>
                  <div className="text-slate-400 space-y-0.5">
                    <div>Cannot move; denied Dexterity bonus</div>
                    <div>-4 penalty to Armor Class</div>
                    <div>Cannot cast spells with somatic/material components</div>
                    <div>Verbal/mental actions only</div>
                    <div>Single CMB or Escape Artist check frees both pin and grapple</div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
                  <div className="font-bold font-mono text-emerald-300">Tied Up (Helpless):</div>
                  <div className="text-slate-400 space-y-0.5">
                    <div>Bound; treated as having Dexterity 0 (-5 mod)</div>
                    <div>Melee attacks against target have +4 bonus</div>
                    <div>Eligible for Coup de Grace</div>
                    <div>Escape DC = 20 + Grappler&apos;s CMB</div>
                    <div>If DC &gt; 20 + target CMB, escape is impossible even on Nat 20</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
