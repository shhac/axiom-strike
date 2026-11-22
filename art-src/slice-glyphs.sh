#!/usr/bin/env bash
# Cuts the bracket glyphs and the claw icon out of their magenta sheets, to the sizes the other
# glyphs (128 tall) and icons (96 square) use.
set -euo pipefail
cd "$(dirname "$0")"
KEY=(-fuzz 18% -transparent "#FF00FF")
magick brackets_atlas.png -crop 50%x100%+0+0 +repage "${KEY[@]}" -trim +repage -filter point -resize x128 ../public/assets/glyphs/open.png
magick brackets_atlas.png -gravity East -crop 50%x100%+0+0 +repage "${KEY[@]}" -trim +repage -filter point -resize x128 ../public/assets/glyphs/close.png
magick claw_icon.png "${KEY[@]}" -trim +repage -filter point -resize 92x92 -background none -gravity center -extent 96x96 ../public/assets/icons/claw.png

# The 4x3 sheet of icons for chests, the camp and monster quirks.
names=(chest chest_open target grimoire key helmet cave paw quill flame crown lock3)
for i in "${!names[@]}"; do
  magick icons3_atlas.png -crop "25%x33.333%+$(( (i % 4) * 1254 / 4 ))+$(( (i / 4) * 1254 / 3 ))" +repage "${KEY[@]}" \
    -trim +repage -filter point -resize 92x92 -background none -gravity center -extent 96x96 \
    "../public/assets/icons/${names[$i]}.png"
done

# Backgrounds for the far lands, and grey copies of both maps for lands that have few stars yet.
for name in far_map big_peaks fraction_fields; do magick "$name.png" -quality 82 "../public/assets/bg/$name.webp"; done
for name in world_map far_map; do
  magick "$name.png" -colorspace Gray -brightness-contrast -6x-12 -quality 80 "../public/assets/bg/${name}_grey.webp"
done

# The monster helmet, new and battered, on one shared canvas so swapping them does not shift it.
for side in "West helmet" "East helmet_dented"; do
  set -- $side
  magick helmet_atlas.png -gravity "$1" -crop 50%x100%+0+0 +repage "${KEY[@]}" -trim +repage \
    -background none -gravity south -extent 560x300 -filter point -resize 160x "../public/assets/icons/$2.png"
done
