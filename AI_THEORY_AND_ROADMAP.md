# The Pathfinder 1e AI Oracle: Architectural Theory & Integration Plan

## Executive Vision
Pathfinder 1st Edition is arguably the most mathematically intricate tabletop roleplaying system ever published. With 10+ years of sourcebooks, 40+ base/prestige classes, thousands of feats, intricate bonus stacking hierarchies, and complex combat states (e.g. grapple flowcharts, iterative attacks with two-weapon fighting and haste), PF1e is notorious for table slowdown.

Most digital tools are either rigid spreadsheets or passive text wikis. By integrating **Gemini 2.5/Flash and specialized multimodality** directly into this modular workspace, we transform the character sheet from a passive record into an **active Tabletop Copilot**.

---

## 1. The Core Theoretical Pillars

```
                     ┌────────────────────────────────┐
                     │   Pathfinder 1e AI Copilot     │
                     └────────────────┬───────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
  [Vision & OCR]              [Rules Arbiter]             [Formula Synthesizer]
 Physical Sheet / Book       RAG over Paizo PRD            Natural Language to
  Statblock Ingestion       Grapple & Stacking Checks       Active Math Engine
         │                            │                            │
         ▼                            ▼                            ▼
  [Build Navigator]           [Combat Narrator]            [Asset Generation]
 Feat Tree / Archetype        Dynamic Turn Flavor        Portraits, Tokens &
   Prerequisite Graphs        Based on Roll Results         Custom Weapon Art
```

---

## Pillar 1: Multimodal Vision & OCR Sheet Ingestion
### The Problem
Players have dog-eared physical character sheets, PDF character exports from Hero Lab or PCGen, or adventure path statblocks. Manually retyping 100+ stats, inventory items, and spells takes 45–60 minutes per character.
### The AI Solution
- **Physical Sheet Scan**: The player snaps a photo of their pencil-and-paper character sheet using their phone or webcam.
- **Multimodal Gemini Vision Ingestion**: Using structured JSON schema outputs, Gemini parses messy handwriting, recognizes standard PF1e formats (Myth-Weavers, Paizo official sheets), and outputs the exact `PF1Character` JSON interface.
- **Statblock Ingestion**: Paste or photograph any Bestiary or Adventure Path statblock (e.g., *"Mature Adult Red Dragon CR 15"*); the AI extracts AC, DR, SR, Attacks, Feats, and Spells, populating a companion or summon sheet in 3 seconds.

---

## Pillar 2: The Rules Arbiter & Flowchart Oracle
### The Problem
During combat, tables frequently stall for 10 minutes debating esoteric rules interactions:
- *"Does my Morale bonus from Heroism stack with my Barbarian Rage morale bonus to Strength?"* (Answer: No, both are Morale bonuses).
- *"I am grappled by a Large tentacle monster. Can I cast a spell with Somatic components using a light weapon in hand, and what is my concentration check DC?"*
### The AI Solution
- **Grounded Semantic RAG**: Index the entire Paizo Pathfinder Reference Document (PRD) and official FAQ rulings.
- **Context-Aware Adjudication**: When the player asks a question, the copilot passes their character's active state (current buffs in `BuffBox`, active conditions like `grappled`, active feats like `Combat Casting`).
- **Flowchart Assistant**: Instead of a wall of text, the AI renders a step-by-step interactive decision card directly above the dice tray (e.g., *"Step 1: Make Concentration Check (DC 10 + CMB 14 + Spell Level 3 = DC 27). Your bonus is +12. Need a 15+ on 1d20."*).

---

## Pillar 3: Natural Language DSL & Macro Synthesizer
### The Problem
Our sheet features a powerful custom DSL formula engine (`1d8 + floor(level/2) fire`, `bab + str_mod + 2`), but casual players don't know syntax or programming operators.
### The AI Solution
- The player types plain English into the DSL studio:
  - *"My sword does 1d8 slashing plus 1d6 fire, and adds +2 when flanking."*
  - *"At level 7, my dragon breath does 3d6 fire, plus another d6 every 2 levels after that."*
- Gemini translates the natural language into the exact formula string with references to existing variables:
  - Output: `1d8 + str_mod + (is_flanking ? 2 : 0) + " slashing and 1d6 fire"`
- The user clicks **"Apply to Attack"** with zero coding needed.

---

## Pillar 4: Feat Tree & Build Path Navigator
### The Problem
Pathfinder 1e has over 3,000 feats. Choosing feats is paralyzed by hidden prerequisite traps (e.g. needing Dodge + Mobility + Spring Attack + BAB +6 + Dex 13 for Whirlwind Attack).
### The AI Solution
- **Archetype Swap Auditor**: When creating an archetype (like *Sword Saint Samurai* or *Gunslinger Pistolero*), the AI verifies which core class abilities are replaced, avoiding illegal double-archetype combinations.
- **Interactive Prerequisite Graph**: Given a build goal (*"I want to make a crit-fishing dual-kukri Slayer"*), the AI scans the character's current BAB and ability scores and outputs a prioritized level 1–20 feat roadmap with prerequisite warnings.

---

## Pillar 5: Dynamic Turn Narrator & Combat Log
### The Problem
Digital dice rollers output dry numbers (`Rolled 24 against AC 21. Dealt 14 damage`). The theatrical spirit of the tabletop is lost in the calculator.
### The AI Solution
- **Contextual Turn Narration**: When a critical hit is confirmed or a saving throw barely succeeds against an Ancient Lich's *Finger of Death*, the AI synthesizes a 2-sentence cinematic description using the character's personality and bio traits:
  - *"Valerius raises his flame-wreathed greataxe with divine fury, cleaving cleanly through the demon's chiten as golden embers shower the stone floor."*
- **DM Whisper Mode**: Generates quick tactical suggestions for players during other turns (*"The troll is taking fire damage from your axe; you might want to delay your action until after the cleric casts Haste."*).

---

## Pillar 6: In-App AI Character & Gear Art Generation
### The Problem
Players spend hours searching Pinterest or Google Images for character portraits and equipment icons that fit their specific race, armor, and weapon combo.
### The AI Solution
- With our newly added **Image & File Browser Modal**, we can add a 4th tab: **"Generate with AI"**.
- Using Gemini Image Generation (e.g. `imagen-3.0-generate-002`), the prompt is automatically compiled from the character's live data:
  - *"Fantasy portrait of Valerius, Male Human Paladin / Dragon Disciple, adorned in polished mithral full plate with draconic crest, wielding a flaming greataxe, dramatic warm lighting, oil painting style."*
- The resulting high-resolution artwork is saved straight to the character's portrait carousel and inventory icons with a single click.

---

## Phased Implementation Roadmap

| Phase | Feature | Complexity | Key Benefit |
|-------|---------|------------|-------------|
| **Phase 1** | **AI Formula Studio Synthesizer** | Low (Text-to-DSL) | Converts English descriptions into executable macro formulas. |
| **Phase 2** | **Image Generator in File Browser** | Medium (Gemini Image API) | Generates custom character portraits & weapon icons on demand. |
| **Phase 3** | **Sheet OCR & Monster Ingestion** | Medium-High (Gemini Multimodal) | Instant digitizing of paper character sheets and monster PDFs. |
| **Phase 4** | **Rules Arbiter & Stacking Assistant** | High (RAG + Contextual State) | Instant resolution of grapple, bonus stacking, and spell interactions. |
| **Phase 5** | **Feat Tree & Prerequisite Navigator** | High (Graph Logic) | Guides level-up progression without rules mistakes. |
