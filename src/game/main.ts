/**
 * Game bootstrap entry point.
 * Mounts the Phaser VillageScene into a parent element and returns a cleanup function.
 */
import * as Phaser from 'phaser';
import type { TimeOfDay } from '@core/types';
import { VillageScene } from './VillageScene';

export interface GameMountOptions {
  timeOfDay?: TimeOfDay;
  onBuildingEnter?: (buildingId: string) => void;
}

export function mountVillage(parent: HTMLElement, opts: GameMountOptions = {}): { destroy(): void } {
  const { width, height } = parent.getBoundingClientRect();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width,
    height,
    parent,
    scale: {
      mode: Phaser.Scale.RESIZE,
    },
    backgroundColor: '#2a2a2a',
    scene: [VillageScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    pixelArt: true,
    roundPixels: true,
  });

  // Pass initial data to the scene once it's ready
  game.events.on('ready', () => {
    const village = game.scene.getScene('Village') as VillageScene;
    village.init({
      timeOfDay: opts.timeOfDay ?? 'day',
      onBuildingEnter: opts.onBuildingEnter,
    });
  });

  function destroyGame(): void {
    game.destroy(true);
  }

  // Handle resize
  function onResize(): void {
    const { width: w, height: h } = parent.getBoundingClientRect();
    game.scale.resize(w, h);
  }
  window.addEventListener('resize', onResize);
  onResize(); // initial

  return {
    destroy: (): void => {
      window.removeEventListener('resize', onResize);
      destroyGame();
    },
  };
}
