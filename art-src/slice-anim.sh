#!/usr/bin/env bash
# Slices the 4x4 animation sheets (one 4-frame loop per row, on magenta) into one strip of four
# frames per character in public/assets/chars/anim/.
#   Monsters: each is fitted to a 160px frame with its feet lined up frame to frame.
#   Hero: every pose is cut at the same scale and baseline (240x264 frames), so he does not
#   change size or slide when the pose changes.
# Usage: bash art-src/slice-anim.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/assets/chars/anim
TMP=$(mktemp -d)
KEY=(-fuzz 18% -transparent "#FF00FF")

bounds() { magick "$1" -trim -format "%w %h %X %Y\n" info: | tr -d '+'; }

# monster <sheet> <row> <name> <grounded 0|1> [rows of the cell to ignore at the bottom]
monster() {
  local sheet=$1 row=$2 name=$3 grounded=$4 trim=${5:-0} frame=160 inset=6
  local cell=$(( $(magick identify -format "%w" "$sheet") / 4 ))
  local lefts=() tops=() rights=() bottoms=() frames=()
  for col in 0 1 2 3; do
    magick "$sheet" -crop "${cell}x$(( cell - trim ))+$(( col * cell ))+$(( row * cell ))" +repage "${KEY[@]}" "$TMP/$name-$col.png"
    read -r w h ox oy < <(bounds "$TMP/$name-$col.png")
    lefts+=("$ox"); tops+=("$oy"); rights+=($(( ox + w ))); bottoms+=($(( oy + h )))
  done
  local left top right bottom
  left=$(printf "%s\n" "${lefts[@]}" | sort -n | head -1)
  top=$(printf "%s\n" "${tops[@]}" | sort -n | head -1)
  right=$(printf "%s\n" "${rights[@]}" | sort -n | tail -1)
  bottom=$(printf "%s\n" "${bottoms[@]}" | sort -n | tail -1)
  for col in 0 1 2 3; do
    local drop=0
    [ "$grounded" = 1 ] && drop=$(( bottom - bottoms[col] ))
    magick "$TMP/$name-$col.png" -background none -roll "+0+${drop}" \
      -crop "$(( right - left ))x$(( bottom - top ))+${left}+${top}" +repage \
      -resize "$(( frame - 2 * inset ))x$(( frame - 2 * inset ))" \
      -gravity south -extent "${frame}x$(( frame - inset ))" -gravity north -extent "${frame}x${frame}" \
      "$TMP/$name-f$col.png"
    frames+=("$TMP/$name-f$col.png")
  done
  magick "${frames[@]}" +append -strip "$OUT/$name.png"
}

# hero <sheet> <row> <name> <grounded 0|1> <zoom %> [rows above the cell to include]
# A jump (not grounded) keeps its height above frame one. A raised sword pokes into the row
# above, so that row is cut a little taller; the others are padded instead to stay the same size.
hero() {
  local sheet=$1 row=$2 name=$3 grounded=$4 zoom=$5 above=${6:-0} pad=30 baseline=300
  local cell=$(( $(magick identify -format "%w" "$sheet") / 4 ))
  local frames=() first=
  for col in 0 1 2 3; do
    magick "$sheet" -crop "${cell}x$(( cell + above ))+$(( col * cell ))+$(( row * cell - above ))" +repage "${KEY[@]}" \
      -background none -resize "${zoom}%" -gravity south -extent "${cell}x$(( cell + pad ))" "$TMP/$name-$col.png"
    read -r w h ox oy < <(bounds "$TMP/$name-$col.png")
    local foot=$(( oy + h ))
    [ -z "$first" ] && first=$foot
    [ "$grounded" = 1 ] || foot=$first
    magick "$TMP/$name-$col.png" -background none -gravity northwest \
      -extent "${cell}x$(( cell + pad ))+0+$(( foot - baseline - pad ))" +repage \
      -resize 240x264 "$TMP/$name-f$col.png"
    frames+=("$TMP/$name-f$col.png")
  done
  magick "${frames[@]}" +append -strip "$OUT/$name.png"
}

hero art-src/anim_a.png 0 hero_idle 1 88
monster art-src/anim_a.png 1 enemy_add 1
monster art-src/anim_a.png 2 enemy_sub 1
monster art-src/anim_a.png 3 enemy_mul 0
monster art-src/anim_b.png 0 enemy_div 1
monster art-src/anim_b.png 1 boss_add 1
monster art-src/anim_b.png 2 boss_sub 1
monster art-src/anim_b.png 3 boss_mul 1
monster art-src/anim_c.png 0 boss_div 1 24
monster art-src/anim_d.png 0 enemy_add_hurt 1
monster art-src/anim_d.png 1 enemy_sub_hurt 1
monster art-src/anim_d.png 2 enemy_mul_hurt 0
monster art-src/anim_d.png 3 enemy_div_hurt 1
monster art-src/anim_e.png 0 boss_add_hurt 1
monster art-src/anim_e.png 1 boss_sub_hurt 1
monster art-src/anim_e.png 2 boss_mul_hurt 1
monster art-src/anim_e.png 3 boss_div_hurt 1
hero art-src/anim_c.png 1 hero_victory 0 100 30
hero art-src/anim_c.png 2 hero_attack 1 100
hero art-src/anim_c.png 3 hero_hurt 1 100
rm -rf "$TMP"
