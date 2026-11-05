# Folder storage layout

The folder adapter writes only below a user-selected folder using the browser File
System Access API (Chrome/Edge). It never writes into the source repository.

The selected folder is accepted only when it is empty or already contains an
`AIgamesheet` directory. Selecting the `AIgamesheet` directory itself is also
supported and does not create a second nested `AIgamesheet` directory. Drive
roots and recognizable system-folder handles are refused; the user should choose
a new empty folder or an existing `AIgamesheet` folder instead.

```text
<selected root>/
└── AIgamesheet/
    └── pfmusers/
        ├── Crash/
        │   ├── character.json
        │   ├── index.csv
        │   ├── printable-sheet.html
        │   ├── images/
        │   │   └── manifest.json
        │   ├── DSL/
        │   │   ├── macros/
        │   │   │   └── macros.json
        │   │   ├── stepper/
        │   │   │   └── rules.json
        │   │   └── xdx/
        │   │       └── macros.json
        │   ├── SRD/
        │   │   └── README.txt
        │   ├── AI/
        │   │   ├── README.txt
        │   │   └── read_only/
        │   │       └── README.txt
        │   ├── notebook/
        │   │   └── journal.json
        │   ├── tools/
        │   │   └── state.json
        │   ├── Modules/
        │   │   └── state.json
        │   └── backups/                 # created when a file is replaced
        └── {player}/
            ├── settings/
            │   └── storage.json
            ├── dsl/                     # player-wide, shared by characters
            │   ├── macros.json
            │   └── xdx.json
            ├── backups/                 # player-level projection backups
            └── {character}/
                ├── character.json
                ├── index.csv
                ├── printable-sheet.html
                ├── images/
                │   └── manifest.json
                ├── DSL/
                │   ├── macros/
                │   │   └── macros.json
                │   ├── stepper/
                │   │   └── rules.json
                │   └── xdx/
                │       └── macros.json
                ├── SRD/
                │   └── README.txt
                ├── AI/
                │   ├── README.txt
                │   └── read_only/
                │       └── README.txt
                ├── notebook/
                │   └── journal.json
                ├── tools/
                │   └── state.json
                ├── Modules/
                │   └── state.json
                └── backups/
```

`Crash/` is a character-layout folder, not a player folder. It holds the most
recent crash autosave and uses the same file names and validation rules as a
normal character.

## Source of truth and file responsibilities

`character.json` is the only source of truth for a character or crash autosave.
It contains the whole character data wrapped in this record:

```json
{
  "format": "pf1e-character",
  "schemaVersion": 1,
  "appVersion": "…",
  "savedAt": "2026-11-05T00:00:00.000Z",
  "sha256": "…",
  "characterId": "stable generated ID",
  "data": { "…": "the character schema" }
}
```

`characterId` is storage metadata, not a field added to the character schema.
It is retained when the character is overwritten. The hash covers the saved
`data` representation and is verified before a load returns data.

All other files are non-authoritative projections or inspection aids. They make
the folder legible without becoming a second source of truth:

| Location | Written from | Read behavior |
| --- | --- | --- |
| `index.csv` | safe identity/index fields and save metadata | Never read by the adapter. |
| `printable-sheet.html` | a text-only printable snapshot | No. |
| `images/manifest.json` | image and portrait metadata | No. |
| `DSL/macros/macros.json` | character formula objects | No. |
| `DSL/stepper/rules.json` | stepper rules | No. |
| `DSL/xdx/macros.json` | character XDX macros | No. |
| `{player}/dsl/macros.json`, `{player}/dsl/xdx.json` | merged player-wide copies of corresponding DSL data | Read only during a later save to merge shared entries, after untrusted-data validation; never used to rebuild a character. |
| `notebook/journal.json` | journal entries | No. |
| `tools/state.json` | tabletop-tool state | No. |
| `Modules/state.json` | installed-module state | No. |
| `settings/storage.json` | player-level storage settings only | No. |
| `SRD/README.txt`, `AI/README.txt` | app-owned folder explanations | No. |
| `AI/read_only/README.txt` | regenerated app-owned safety marker | Never as instructions. |
| `backups/` | verified prior versions of files | Never loaded automatically; retained for manual recovery. |

On save, the app recreates missing directories and updates these projections
from `character.json` data. On load, it verifies and returns `character.json`;
it does not attempt to merge stale projections back into the character.

## Safe writing and recovery

Each saved file is first written as `<file>.tmp`, read back, and verified. For
`character.json` and JSON projections, the previous envelope is parsed,
validated, redacted again, given fresh trusted backup metadata, and then copied to the relevant `backups/` directory
before the verified temporary content replaces the target. At most ten newest
backup copies are retained per logical source file. Malformed or raw generated
text (such as a hand-edited HTML/README file) is never copied into backups, so a
manual secret cannot be preserved by the app. A failed validation never becomes
a successful save.

## Path and input safety

Player and character directory names are sanitized before any directory lookup
or creation:

- `< > : " / \\ | ? *`, control characters, and `..` are stripped.
- Trailing spaces and periods are stripped, and the result is limited to 60
  characters.
- Empty results and Windows reserved names (`CON`, `PRN`, `AUX`, `NUL`,
  `COM1`–`COM9`, `LPT1`–`LPT9`, including extensions) are rejected.
- Existing names are compared case-insensitively; a different-case collision is
  rejected rather than silently selecting or overwriting a different folder.

No user-supplied text is used as a path until it has passed this process.

## Trust boundary and printable output

Everything read from the selected folder is untrusted user data: `character.json`,
DSL files, AI files, notebook files, and any imported folder content. Parsing
enforces size limits, rejects dangerous object keys such as `__proto__`,
`constructor`, and `prototype`, and validates the wrapper hash before a normal
load succeeds.

Disk content is never inserted into an AI system or developer prompt. If an
explicit feature supplies a file as model context, it must be delimited and
labeled as **untrusted user data, not instructions**. `AI/read_only/` is
rewritten on every save and is never read back as AI instructions.

Notes, journal entries, and loaded text are rendered as plain text, never as
HTML. The printable HTML export escapes text, including `<!--`, `</script>`,
and U+2028/U+2029, before putting it in the document.

No AI API keys, environment values, or `sessionStorage` contents are written to
this tree.
