# Writes lib/moveArt.ts from what is in assets/moves/.
#
#   python -X utf8 scripts/move-index.py
#
# Ninety pictures are too many requires to keep by hand, and a require for a file that
# is not there breaks the build. So the table lists exactly the strips that exist
# (scripts/move-assets.py makes them): <move id>_<advisor id>.png.
from pathlib import Path

root = Path(__file__).parent.parent
found: dict[str, list[str]] = {}
for f in sorted((root / 'assets' / 'moves').glob('*.png')):
    if f.name.startswith('_'):
        continue
    for girl in ('geumhwa', 'seora', 'dohwa'):
        if f.stem.endswith('_' + girl):
            found.setdefault(f.stem[: -len(girl) - 1], []).append(girl)

lines = [
    '/**',
    ' * The demonstration strips, by movement and by girl. Written by',
    ' * scripts/move-index.py from the files in assets/moves — do not edit by hand.',
    ' *',
    ' * Each strip is the frames side by side in square cells. A movement drawn for',
    ' * one girl and not yet for another is shown by the one who has it: a',
    ' * demonstration by the wrong girl is still a demonstration.',
    ' */',
    'const MOVE_ART: Record<string, Record<string, number>> = {',
]
for move, girls in found.items():
    lines.append(f'  {move}: {{')
    for girl in girls:
        lines.append(f"    {girl}: require('../assets/moves/{move}_{girl}.png'),")
    lines.append('  },')
lines += [
    '};',
    '',
    'export function moveArt(moveId: string, advisorId: string): number | undefined {',
    '  const drawn = MOVE_ART[moveId];',
    '  return drawn?.[advisorId] ?? (drawn ? Object.values(drawn)[0] : undefined);',
    '}',
    '',
]
(root / 'lib' / 'moveArt.ts').write_text('\n'.join(lines), encoding='utf-8', newline='\n')
print(f'lib/moveArt.ts: {sum(len(g) for g in found.values())} strips of {len(found)} movements')
