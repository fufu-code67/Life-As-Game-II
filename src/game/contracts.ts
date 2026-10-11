/**
 * Game-layer contracts — Phase 2. Frozen by orchestrator.
 * The Phaser scene reads ONLY from core (via event bus + core services);
 * it must never touch Dexie directly.
 */

import type { TimeOfDay } from '@core/types';

/** Grid-based village map. Coordinates are tile units. */
export interface VillageMapSpec {
  width: number; // tiles
  height: number; // tiles
  tileSize: number; // 16
  /** Solid tiles the player cannot walk through. */
  collisionTiles: ReadonlySet<number>;
  /** Buildings: clickable, open an overlay. */
  buildings: readonly BuildingSpec[];
}

export interface BuildingSpec {
  id: 'hero-house' | 'tavern' | 'gym' | 'library' | 'market';
  /** Top-left tile position. */
  x: number;
  y: number;
  wTiles: number;
  hTiles: number;
  /** Overlay to open on interaction (ui component id). */
  overlay: string;
}

export interface PlayerController {
  /** Tap/click-to-move: move to tile if walkable, else ignore. */
  moveToTile(tx: number, ty: number): void;
  /** Current tile position. */
  tileX: number;
  tileY: number;
}

export interface SceneBootstrapper {
  /** Create the village scene. Called from game/main.ts with the parent element. */
  createVillage(parent: HTMLElement, opts?: { timeOfDay?: TimeOfDay }): { destroy(): void };
}

/** Depth ordering: y-sorted entities. Buildings use topOfMapDepth = 1000. */
export const DEPTHS = { ground: 0, deco: 5, entity: 10, overlay: 1000 } as const;
