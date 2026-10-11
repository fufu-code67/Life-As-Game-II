#!/usr/bin/env python3
"""LifeAsGame v4 building sprite generator (reproducible asset pipeline).

Generates 5 buildings x 3 upgrade stages as pixel-art PNGs (48x56 each),
drawn programmatically with one shared palette and consistent light
direction (top-left lit, shadow bottom-right). No manual per-file edits.

Usage: python3 scripts/gen_buildings.py   (writes assets/generated/buildings/)
"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'generated', 'buildings')

# Shared ~32-color palette (subset relevant for buildings)
PAL = {
    'outline': (43, 40, 48, 255),
    'wall_wood': (157, 108, 68, 255),
    'wall_wood_dark': (117, 76, 46, 255),
    'wall_stone': (168, 162, 158, 255),
    'wall_stone_dark': (126, 120, 116, 255),
    'wall_plaster': (222, 214, 196, 255),
    'wall_plaster_dark': (188, 178, 158, 255),
    'roof_red': (188, 74, 74, 255),
    'roof_red_dark': (140, 52, 52, 255),
    'roof_blue': (86, 110, 176, 255),
    'roof_blue_dark': (60, 80, 134, 255),
    'roof_green': (98, 132, 82, 255),
    'roof_green_dark': (70, 98, 58, 255),
    'roof_brown': (140, 96, 60, 255),
    'roof_brown_dark': (104, 70, 42, 255),
    'door': (84, 56, 36, 255),
    'door_light': (120, 84, 52, 255),
    'window': (255, 220, 120, 255),
    'window_dark': (60, 56, 64, 255),
    'dumbbell': (200, 204, 210, 255),
    'banner': (222, 214, 196, 255),
    'book': (188, 74, 74, 255),
    'shadow': (0, 0, 0, 60),
}

W, H = 48, 56

def base_canvas():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def roof(d, x0, x1, y0, y1, main, dark):
    """Gabled roof between y0..y1, light from top-left. Bottom row overlaps wall top."""
    for y in range(y0, y1):
        t = (y - y0) / max(1, (y1 - y0))
        left = x0 + (0 if y < y0 + 2 else (y - y0) - 1)
        right = x1 - (0 if y < y0 + 2 else (y - y0) - 1)
        if left > right:
            break
        col = dark if y % 4 >= 2 else main
        d.rectangle([left, y, right, y], fill=col)
    d.line([x0, y1 - 1, x1, y1 - 1], fill=PAL['outline'])

def walls(d, x0, x1, y0, y1, main, dark):
    """Walls; y0 must sit at roof bottom row so no gap shows."""
    d.rectangle([x0, y0 - 1, x1, y1], fill=main)
    d.rectangle([x1 - 4, y0 - 1, x1, y1], fill=dark)  # right shade
    d.rectangle([x0, y0 - 1, x1, y0 - 1], fill=dark)  # shade line under roof

def door(d, cx, y_bottom):
    d.rectangle([cx - 3, y_bottom - 10, cx + 2, y_bottom], fill=PAL['door'])
    d.rectangle([cx - 3, y_bottom - 10, cx - 3, y_bottom], fill=PAL['door_light'])
    d.rectangle([cx - 3, y_bottom - 10, cx + 2, y_bottom], outline=PAL['outline'])

def window(d, x, y, lit=True):
    d.rectangle([x, y, x + 5, y + 5], fill=PAL['window'] if lit else PAL['window_dark'])
    d.rectangle([x, y, x + 5, y + 5], outline=PAL['outline'])

def outline_rect(d, x0, y0, x1, y1):
    d.rectangle([x0, y0, x1, y1], outline=PAL['outline'])

def sign(d, x, y, color):
    d.rectangle([x, y, x + 7, y + 5], fill=color, outline=PAL['outline'])


def hero_house(stage: int) -> Image.Image:
    im, d = base_canvas()
    roof(d, 6, 41, 4, 20, PAL['roof_blue'], PAL['roof_blue_dark'])
    walls(d, 8, 39, 20, 48, PAL['wall_plaster'], PAL['wall_plaster_dark'])
    door(d, 14, 48)
    window(d, 24, 26)
    if stage >= 2:
        window(d, 32, 26)
    if stage >= 3:
        window(d, 24, 38)
        window(d, 32, 38)
        roof(d, 2, 12, 14, 26, PAL['roof_blue'], PAL['roof_blue_dark'])  # side tower
    outline_rect(d, 8, 20, 39, 48)
    return im

def tavern(stage: int) -> Image.Image:
    im, d = base_canvas()
    roof(d, 4, 43, 6, 22, PAL['roof_brown'], PAL['roof_brown_dark'])
    walls(d, 6, 41, 22, 48, PAL['wall_wood'], PAL['wall_wood_dark'])
    door(d, 22, 48)
    window(d, 10, 28)
    window(d, 32, 28)
    sign(d, 36, 30, PAL['banner'])
    if stage >= 2:
        sign(d, 12, 34, PAL['banner'])
    if stage >= 3:
        window(d, 10, 40)
        window(d, 32, 40)
        roof(d, 34, 46, 12, 24, PAL['roof_brown'], PAL['roof_brown_dark'])
    outline_rect(d, 6, 22, 41, 48)
    return im

def gym(stage: int) -> Image.Image:
    im, d = base_canvas()
    roof(d, 6, 41, 4, 20, PAL['roof_red'], PAL['roof_red_dark'])
    walls(d, 8, 39, 20, 48, PAL['wall_stone'], PAL['wall_stone_dark'])
    door(d, 14, 48)
    window(d, 24, 26)
    if stage >= 2:
        d.rectangle([28, 30, 36, 32], fill=PAL['dumbbell'], outline=PAL['outline'])
    if stage >= 3:
        window(d, 24, 38)
        d.rectangle([26, 40, 38, 44], fill=PAL['dumbbell'], outline=PAL['outline'])
    outline_rect(d, 8, 20, 39, 48)
    return im

def library(stage: int) -> Image.Image:
    im, d = base_canvas()
    roof(d, 4, 43, 6, 22, PAL['roof_green'], PAL['roof_green_dark'])
    walls(d, 6, 41, 22, 48, PAL['wall_plaster'], PAL['wall_plaster_dark'])
    door(d, 22, 48)
    window(d, 10, 28)
    window(d, 32, 28)
    if stage >= 2:
        sign(d, 18, 34, PAL['book'])
    if stage >= 3:
        window(d, 10, 40)
        window(d, 32, 40)
        roof(d, 30, 46, 12, 24, PAL['roof_green'], PAL['roof_green_dark'])
    outline_rect(d, 6, 22, 41, 48)
    return im

def market(stage: int) -> Image.Image:
    im, d = base_canvas()
    roof(d, 4, 43, 8, 20, PAL['roof_red'], PAL['roof_red_dark'])
    walls(d, 6, 41, 20, 48, PAL['wall_wood'], PAL['wall_wood_dark'])
    door(d, 14, 48)
    # market stalls front
    d.rectangle([26, 34, 38, 40], fill=PAL['banner'], outline=PAL['outline'])
    if stage >= 2:
        d.rectangle([8, 36, 20, 42], fill=PAL['banner'], outline=PAL['outline'])
    if stage >= 3:
        window(d, 30, 24)
        d.rectangle([26, 44, 38, 48], fill=PAL['door_light'], outline=PAL['outline'])
    outline_rect(d, 6, 20, 41, 48)
    return im


BUILDINGS = {
    'hero-house': hero_house,
    'tavern': tavern,
    'gym': gym,
    'library': library,
    'market': market,
}

def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in BUILDINGS.items():
        for stage in (1, 2, 3):
            img = fn(stage)
            path = os.path.join(OUT, f'{name}_stage{stage}.png')
            img.save(path)
            print('wrote', path)

if __name__ == '__main__':
    main()
