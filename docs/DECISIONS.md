# Decisions

## Phase 0 (11.10.2026)

- **Repo name `Life-As-Game-II`** (user decision; "II" roman numeral) — fresh build, no shared history with v3.
- **Dexie instead of sql.js/Flask** — local-first browser app, no backend needed for Phase 1–5; sync is a later plug-in point.
- **Svelte 5 + Vite 6 + Phaser 3.87 + TS strict.** Pinned in package.json at Phase 0.
- **Skill level XP ramp** `50 + (level-1)*75` — simple, monotonic, testable; tune in Phase 5 with real play data.
- **Streak bonus:** +10% per day capped at +100% — keeps big streaks meaningful but bounded.
- **New dependency policy:** any new dep requires an entry here.

## Phase 3 (11.10.2026)

- **AI via single OpenRouter call** with model chain `z-ai/glm-5.3-flash` → `moonshotai/kimi-k3`; Zod-validated JSON; invalid shape → next model, both fail → safe deferral (no blocking dialog).
- **Offline-first AI:** empty API key → no call at all, toast "Skill mapping deferred"; the game must be fully playable without a key.
- **Skill matching:** exact normalized-name match first (no AI call); AI only for the rest. New dep: `zod` (schema validation for AI responses).
- **Buildings keep single v2 sprites** (user preference: v3 assets, generated ones rejected) — future level-up feedback via effects (window light, particles), not sprite swaps.
- **Event `ai:skillmatch:failed` added to AppEventMap** (additive change to frozen types — approved as per policy).
