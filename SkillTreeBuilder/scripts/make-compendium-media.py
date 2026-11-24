"""Turns the arena's recordings into the ability compendium's media (public/compendium).

The game's arena self-check films each ability test (LegendSmith-Merge, ArenaTest: -arenatest -arenatest-trials <shots>
-arenatest-record <clips>): a folder of JPEG frames and their times per test under <clips>, and a picture from the player's view
(trial-<Key>.png) under <shots>. This makes, for each test:

  public/compendium/<Key>.gif  the clip, 480 x 270 at about 8 frames a second, one shared palette, each frame shown as long as it
                               lasted in the game (the arena's moving mist changes most pixels every frame, so size is kept down
                               by size, colours and frame rate)
  public/compendium/<Key>.jpg  the player's view, 960 wide

Run with Pillow (the prep folder's Tools/.venv has it):
  python scripts/make-compendium-media.py <clips> <shots> [public/compendium]
"""

import sys
from pathlib import Path

from PIL import Image

WIDTH, HEIGHT = 480, 270
COLOURS = 96
MIN_STEP = 0.12  # seconds between kept frames (about 8 a second)
STILL_WIDTH = 960


def palette_for(frames):
    """One palette for the whole clip, from a sheet of every few frames, so colours don't flicker between frames."""
    sample = frames[:: max(1, len(frames) // 12)]
    sheet = Image.new('RGB', (WIDTH, HEIGHT * len(sample)))
    for i, frame in enumerate(sample):
        sheet.paste(frame, (0, HEIGHT * i))
    return sheet.quantize(colors=COLOURS, method=Image.Quantize.MEDIANCUT)


def make_gif(clip: Path, out: Path) -> int:
    files = sorted(clip.glob('f*.jpg'))
    if not files:
        return 0
    times = [float(t) for t in (clip / 'times.txt').read_text().split()] if (clip / 'times.txt').exists() else []
    if len(times) == len(files):
        # Keep a frame at least MIN_STEP after the last kept one.
        kept, last = [], -1.0
        for f, t in zip(files, times):
            if t - last >= MIN_STEP - 1e-3:
                kept.append((f, t))
                last = t
        files = [f for f, _ in kept]
        times = [t for _, t in kept]
    frames = [Image.open(f).convert('RGB').resize((WIDTH, HEIGHT), Image.LANCZOS) for f in files]
    palette = palette_for(frames)
    indexed = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
    durations = []
    for i in range(len(indexed)):
        if i + 1 < len(times):
            durations.append(max(40, int(round((times[i + 1] - times[i]) * 1000))))
        else:
            durations.append(1200)  # a pause on the last frame before it loops
    indexed[0].save(out, save_all=True, append_images=indexed[1:], duration=durations, loop=0, optimize=True, disposal=1)
    return out.stat().st_size


def make_still(png: Path, out: Path) -> int:
    image = Image.open(png).convert('RGB')
    height = round(image.height * STILL_WIDTH / image.width)
    image.resize((STILL_WIDTH, height), Image.LANCZOS).save(out, quality=84, optimize=True, progressive=True)
    return out.stat().st_size


def main():
    clips = Path(sys.argv[1])
    shots = Path(sys.argv[2])
    out = Path(sys.argv[3]) if len(sys.argv) > 3 else Path(__file__).resolve().parent.parent / 'public' / 'compendium'
    out.mkdir(parents=True, exist_ok=True)
    total = 0
    for clip in sorted(p for p in clips.iterdir() if p.is_dir()):
        size = make_gif(clip, out / f'{clip.name}.gif')
        total += size
        print(f'{clip.name}.gif  {size / 1024:.0f} KB')
    for png in sorted(shots.glob('trial-*.png')):
        if png.stem.endswith('-above'):
            continue
        key = png.stem[len('trial-'):]
        size = make_still(png, out / f'{key}.jpg')
        total += size
        print(f'{key}.jpg  {size / 1024:.0f} KB')
    print(f'total {total / (1024 * 1024):.1f} MB in {out}')


if __name__ == '__main__':
    main()
