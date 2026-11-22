#!/usr/bin/env bash
# Cuts the bracket glyphs and the claw icon out of their magenta sheets, to the sizes the other
# glyphs (128 tall) and icons (96 square) use.
set -euo pipefail
cd "$(dirname "$0")"
KEY=(-fuzz 18% -transparent "#FF00FF")
magick brackets_atlas.png -crop 50%x100%+0+0 +repage "${KEY[@]}" -trim +repage -filter point -resize x128 ../public/assets/glyphs/open.png
magick brackets_atlas.png -gravity East -crop 50%x100%+0+0 +repage "${KEY[@]}" -trim +repage -filter point -resize x128 ../public/assets/glyphs/close.png
magick claw_icon.png "${KEY[@]}" -trim +repage -filter point -resize 92x92 -background none -gravity center -extent 96x96 ../public/assets/icons/claw.png
