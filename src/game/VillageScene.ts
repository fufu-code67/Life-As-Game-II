/**
 * Village scene — grid-based Phaser 3 scene.
 * Player moves by tap/click; buildings are clickable when adjacent.
 */
import * as Phaser from 'phaser';
import type { TimeOfDay } from '@core/types';
import { DEPTHS, type BuildingSpec } from './contracts';
import { VILLAGE_MAP, tileIsWalkable, GROUND_TILES, DECO_TILES, buildingDoorTile } from './villageMap';

interface VillageSceneInitData {
  timeOfDay?: TimeOfDay;
  onBuildingEnter?: ((id: string) => void) | undefined;
}

export class VillageScene extends Phaser.Scene {
  // Game objects
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private buildingObjects: {
    sprite: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    spec: BuildingSpec;
  }[] = [];
  private tooltipText!: Phaser.GameObjects.Text;

  // State
  private tileSize = 16;
  private mapWidth = VILLAGE_MAP.width;
  private mapHeight = VILLAGE_MAP.height;
  private onBuildingEnter?: ((buildingId: string) => void) | undefined;

  // Movement
  private isMoving = false;

  constructor() {
    super({ key: 'Village' });
  }

  init(data: VillageSceneInitData): void {
    this.onBuildingEnter = data.onBuildingEnter;
  }

  preload(): void {
    this.load.image('tiles', 'assets/ninja-adventure/tilesets/tileset.png');
    this.load.spritesheet('hero', 'assets/ninja-adventure/characters/1.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    // Setup tilemap from 2D array
    const groundData = this.generateGroundLayer();
    const tilemap = this.make.tilemap({
      data: groundData,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize,
    });
    const tileset = tilemap.addTilesetImage('tiles');
    if (!tileset) throw new Error('Failed to add tileset image');
    this.groundLayer = tilemap.createLayer(0, tileset, 0, 0)!;
    this.groundLayer.setDepth(DEPTHS.ground);

    // Collision for water/trees/walls
    this.groundLayer.setCollision([...VILLAGE_MAP.collisionTiles]);

    // Player spawns on the central crossroads, not on a building footprint
    this.player = this.physics.add.sprite(
      this.tileSize * 15,
      this.tileSize * 10,
      'hero',
    );
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(DEPTHS.entity);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(12, 12, true);

    // Animations — pack layout: 4 COLUMNS = directions (down, up, left, right),
    // 7 ROWS = frame variants; walk cycle = rows 0..3.
    // Frame index = row * 4 + column.
    const dirCol: Record<string, number | undefined> = { down: 0, up: 1, left: 2, right: 3 };
    for (const dir of ['down', 'up', 'left', 'right'] as const) {
      const col = dirCol[dir];
      if (col === undefined) throw new Error(`unknown direction ${dir}`);
      this.anims.create({
        key: `walk_${dir}`,
        frames: this.anims.generateFrameNumbers('hero', {
          frames: [0, 1, 2, 3].map((row) => row * 4 + col),
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    this.player.anims.play('walk_down');

    // Buildings (placeholder rectangles with labels)
    for (const spec of VILLAGE_MAP.buildings) {
      const color = spec.id === 'hero-house' ? 0x8b4513 :
        spec.id === 'tavern' ? 0x2f4f4f :
        spec.id === 'gym' ? 0x4682b4 :
        spec.id === 'library' ? 0x556b2f :
        0x8b0000; // market
      const rect = this.add.rectangle(
        spec.x * this.tileSize + (spec.wTiles * this.tileSize) / 2,
        spec.y * this.tileSize + (spec.hTiles * this.tileSize) / 2,
        spec.wTiles * this.tileSize,
        spec.hTiles * this.tileSize,
        color,
      );
      rect.setOrigin(0.5, 0.5);
      rect.setDepth(DEPTHS.entity);
      rect.setInteractive();
      rect.on('pointerdown', () => this.onBuildingClick(spec));
      const displayName = spec.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      const label = this.add.text(
        spec.x * this.tileSize + (spec.wTiles * this.tileSize) / 2,
        spec.y * this.tileSize + (spec.hTiles * this.tileSize) / 2,
        displayName,
        { fontSize: '10px', color: '#ffffff', align: 'center' },
      );
      label.setOrigin(0.5, 0.5);
      label.setDepth(DEPTHS.entity + 1);
      this.buildingObjects.push({ sprite: rect, label, spec });
    }

    // Tooltip for building interaction
    this.tooltipText = this.add.text(0, 0, '', {
      fontSize: '12px',
      backgroundColor: '#333',
      padding: { x: 4, y: 2 },
    });
    this.tooltipText.setDepth(DEPTHS.overlay);
    this.tooltipText.setVisible(false);

    // Camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize);
    this.cameras.main.setZoom(3);
    this.cameras.main.roundPixels = true;

    // Input: tap/click to move
    this.input.on('pointerdown', this.onPointerDown, this);

    // Update depth sort each frame (y-sort)
    this.events.on('postupdate', () => {
      this.player.setDepth(DEPTHS.entity + Math.floor(this.player.y / this.tileSize));
      for (const b of this.buildingObjects) {
        b.sprite.setDepth(DEPTHS.entity + Math.floor(b.sprite.y / this.tileSize));
        b.label.setDepth(DEPTHS.entity + 1 + Math.floor(b.label.y / this.tileSize));
      }
    });

    // Physics: player collides with ground layer
    this.physics.add.collider(this.player, this.groundLayer);
  }

  private generateGroundLayer(): number[][] {
    const layer: number[][] = [];
    for (let y = 0; y < this.mapHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        let tile: number = GROUND_TILES.grass;
        // Horizontal dirt path through the middle
        if (y === 9 || y === 10) {
          tile = GROUND_TILES.dirt;
        }
        // Vertical dirt path near center
        if (x === 14 || x === 15) {
          tile = GROUND_TILES.dirt;
        }
        // Small water patch at bottom right
        if (x >= 24 && y >= 16) {
          tile = DECO_TILES.water;
        }
        // Tree patches at corners (solid hedge)
        if ((x < 3 && y < 3) || (x >= 27 && y < 3) || (x < 3 && y >= 17)) {
          tile = DECO_TILES.tree;
        }
        row.push(tile);
      }
      layer.push(row);
    }
    return layer;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tx = Math.floor(worldPoint.x / this.tileSize);
    const ty = Math.floor(worldPoint.y / this.tileSize);

    // Check if it's a building click
    for (const b of this.buildingObjects) {
      const door = buildingDoorTile(b.spec);
      const playerTx = Math.floor(this.player.x / this.tileSize);
      const playerTy = Math.floor(this.player.y / this.tileSize);
      if (Math.abs(playerTx - door.tx) <= 1 && Math.abs(playerTy - door.ty) <= 1) {
        const bounds = b.sprite.getBounds();
        if (bounds.contains(worldPoint.x, worldPoint.y)) {
          this.onBuildingClick(b.spec);
          return;
        }
      }
    }

    // Otherwise, move to tile if walkable
    if (tileIsWalkable(VILLAGE_MAP, tx, ty)) {
      this.moveToTile(tx, ty);
    }
  }

  private moveToTile(tx: number, ty: number): void {
    if (this.isMoving) return;
    const targetX = tx * this.tileSize + this.tileSize / 2;
    const targetY = ty * this.tileSize + this.tileSize / 2;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY);
    if (distance < 1) return;
    this.isMoving = true;

    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    let anim = 'walk_down';
    if (Math.abs(dx) > Math.abs(dy)) {
      anim = dx > 0 ? 'walk_right' : 'walk_left';
    } else {
      anim = dy > 0 ? 'walk_down' : 'walk_up';
    }
    this.player.anims.play(anim, true);

    // Physics-driven movement (no tween/physics conflict)
    const speed = 60; // px/s
    this.physics.moveTo(this.player, targetX, targetY, speed);
    const check = () => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY) < 2) {
        this.player.body.reset(targetX, targetY);
        this.player.anims.play('walk_down', true);
        this.isMoving = false;
      } else {
        this.time.delayedCall(30, check);
      }
    };
    this.time.delayedCall(30, check);
  }

  private onBuildingClick(spec: BuildingSpec): void {
    console.log(`[VillageScene] Building clicked: ${spec.id}`);
    const displayName = spec.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    this.tooltipText.setText(`Open: ${displayName}`);
    this.tooltipText.setPosition(this.player.x, this.player.y - 30);
    this.tooltipText.setVisible(true);
    this.time.delayedCall(1500, () => {
      this.tooltipText.setVisible(false);
    });
    if (this.onBuildingEnter) {
      this.onBuildingEnter(spec.id);
    }
  }
}