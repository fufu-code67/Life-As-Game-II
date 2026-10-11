/**
 * Village map specification — 30x20 tile grid.
 * Tile indices reference ninja-adventure tileset.png (28 cols × 40 rows, 16px tiles).
 */
import type { VillageMapSpec, BuildingSpec } from './contracts';

// ── Tile indices from tileset.png (PIL-verified via contact sheet) ──
// Grass variants (330/462/495 light, 331/500 dark)
const T_GRASS = 330;
const T_GRASS2 = 331;
const T_GRASS3 = 462;
// Dirt / path (uniform orange ground)
const T_DIRT = 365;
const T_DIRT2 = 378;
// Water (uniform blue)
const T_WATER = 244;
const T_WATER2 = 369;
// Solid decoration: use dark grass as impenetrable hedge stand-in until
// generated building/tree assets exist (Phase 2.5 asset pipeline).
const T_TREE = 500;
// No wall tile needed yet
const T_WALL = 500;

/** Tiles the player cannot walk through (water, trees, walls). */
const SOLID_TILES = new Set<number>([
  T_WATER, T_WATER2,
  T_TREE,
  T_WALL,
]);

/** Buildings placed on the village map. */
const BUILDINGS: readonly BuildingSpec[] = [
  { id: 'hero-house', x: 3,  y: 2,  wTiles: 4, hTiles: 3, overlay: 'hero-house' },
  { id: 'tavern',     x: 12, y: 2,  wTiles: 5, hTiles: 3, overlay: 'tavern' },
  { id: 'gym',        x: 22, y: 2,  wTiles: 4, hTiles: 3, overlay: 'gym' },
  { id: 'library',    x: 3,  y: 12, wTiles: 4, hTiles: 3, overlay: 'library' },
  { id: 'market',     x: 18, y: 12, wTiles: 5, hTiles: 3, overlay: 'market' },
];

export const VILLAGE_MAP: VillageMapSpec = {
  width: 30,
  height: 20,
  tileSize: 16,
  collisionTiles: SOLID_TILES,
  buildings: BUILDINGS,
};

/** Tile indices used for ground fill (exported for VillageScene). */
export const GROUND_TILES: { grass: number; grass2: number; grass3: number; dirt: number; dirt2: number } = {
  grass: T_GRASS,
  grass2: T_GRASS2,
  grass3: T_GRASS3,
  dirt: T_DIRT,
  dirt2: T_DIRT2,
};

/** Tile indices for decorative collision tiles (water, trees). */
export const DECO_TILES: { water: number; water2: number; tree: number; wall: number } = {
  water: T_WATER,
  water2: T_WATER2,
  tree: T_TREE,
  wall: T_WALL,
};

/**
 * Check whether a tile position is walkable.
 * A tile is NOT walkable if:
 *  - it falls inside a building footprint (except the door tile).
 *
 * The "door" of each building is the tile at (building.x + floor(wTiles/2), building.y + hTiles)
 * i.e. center-bottom of the building — the player can stand there and interact.
 *
 * Note: collision tile checking (water/trees/walls) is handled by Phaser's
 * tile collision layer; this function only checks building footprints.
 */
export function tileIsWalkable(map: VillageMapSpec, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;

  for (const b of map.buildings) {
    const insideX = tx >= b.x && tx < b.x + b.wTiles;
    const insideY = ty >= b.y && ty < b.y + b.hTiles;
    if (insideX && insideY) {
      // Door tile: center-x of bottom row
      const doorX = b.x + Math.floor(b.wTiles / 2);
      const doorY = b.y + b.hTiles; // just below the building
      if (tx === doorX && ty === doorY) return true;
      return false; // inside building, not door
    }
  }
  return true;
}

/** Get the door tile position for a building (center-x, just below building). */
export function buildingDoorTile(b: BuildingSpec): { tx: number; ty: number } {
  return { tx: b.x + Math.floor(b.wTiles / 2), ty: b.y + b.hTiles };
}
