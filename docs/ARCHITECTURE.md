# Architecture — LifeAsGame v4

## Layers (dependency direction is one-way)

```
ui (Svelte) ──┐
              ├──> core (Dexie, rules, event bus)  <── data (categories, seeds, XP tables)
game (Phaser)─┘
```

- `core` knows neither `game` nor `ui`. No DOM, no Phaser imports in `core`.
- `game` and `ui` talk to `core` ONLY via the event bus (`src/core/eventBus.ts`) and
  exported core functions.
- Types: single source in `src/core/types.ts` (frozen Phase 0).
- Categories + skill seeds: single source in `src/data/`.

## Data

- IndexedDB via Dexie (`lifeasgame_v4`), local-first, no autosave timer.
- Schema v1: `quests(id, status, categoryId, questlineId, createdAt)`,
  `skills(id, name, level, attribute)`, `events(id, startsAt, categoryId)`,
  `meta(key)`.
- Seeds are inserted once on first run; afterwards the DB is authoritative.

## AI

- OpenRouter, single call per case (skill matching, questline generation).
- Primary: `z-ai/glm-5.3-flash`, fallback: `moonshotai/kimi-k3`.
- Key never in code/repo; runtime env/config only.
- AI responses validated (Zod); failures → safe fallback, never data loss.

## Tests

- Vitest for `core` (node env, fake-indexeddb for Dexie tests).
- Playwright smoke: app boots, create quest, complete quest, skill appears.

## Assets

- Base pack: Ninja Adventure (CC0). Buildings generated via reproducible pipeline
  (see docs/ASSETS.md as of Phase 2).
