# Decisions

## Phase 0 (11.10.2026)

- **Repo name `Life-As-Game-II`** (user decision; "II" roman numeral) — fresh build, no shared history with v3.
- **Dexie instead of sql.js/Flask** — local-first browser app, no backend needed for Phase 1–5; sync is a later plug-in point.
- **Svelte 5 + Vite 6 + Phaser 3.87 + TS strict.** Pinned in package.json at Phase 0.
- **Skill level XP ramp** `50 + (level-1)*75` — simple, monotonic, testable; tune in Phase 5 with real play data.
- **Streak bonus:** +10% per day capped at +100% — keeps big streaks meaningful but bounded.
- **New dependency policy:** any new dep requires an entry here.
