#!/usr/bin/env bash
# scripts/anatomy-frames.sh
#
# Convierte el video de despiece generado con Higgsfield en la secuencia de
# fotogramas que consume `src/components/home/AnatomySequence.tsx`.
#
# NO se corre en el build ni en el deploy. Es un script de una sola vez: se
# ejecuta a mano cuando se regenera el video (por ejemplo, si algún día el
# despiece se rehace con otro modelo o con otro tenis) y el resultado se
# commitea como assets estáticos en `public/assets/anatomy/`.
#
# Por qué existe como archivo y no como comandos sueltos: la regla de la
# Fase 3 (ver CLAUDE.md) es que ninguna imagen de Higgsfield entra a
# `public/` sin un paso explícito de redimensionado/compresión. Este script
# ES ese paso, escrito para que el siguiente que regenere el video no tenga
# que adivinar los tamaños ni la calidad.
#
# Uso:
#   ./scripts/anatomy-frames.sh ruta/al/video.mp4
#
# Dependencias (ninguna se agrega a package.json a propósito — son
# herramientas de escritorio, no dependencias del sitio):
#   FFMPEG_BIN  ruta a ffmpeg (por defecto el del PATH)
#   SHARP_PATH  ruta a un módulo `sharp` instalado en otro proyecto,
#               `sharp` instalado en otro proyecto — ver scripts/anatomy-webp.js.

set -euo pipefail

SRC="${1:?uso: anatomy-frames.sh <video.mp4>}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/assets/anatomy"
FFMPEG="${FFMPEG_BIN:-ffmpeg}"

# 96 cuadros para ~320vh de scroll. Más cuadros no se perciben (el dedo no
# tiene esa resolución) y sí se pagan en peso; menos y el despiece se ve
# escalonado al hacer scroll lento.
FRAMES=96

rm -rf "$OUT/desktop" "$OUT/mobile"
mkdir -p "$OUT/desktop" "$OUT/mobile"

# Duración real del video, para repartir los 96 cuadros parejo a lo largo de
# todo el clip en vez de asumir 5s exactos.
# ffmpeg sale con código 1 cuando solo se le pide info (no hay archivo de
# salida) y con `set -o pipefail` eso mataría el script — de ahí el || true.
DUR="$({ "$FFMPEG" -i "$SRC" 2>&1 || true; } | sed -n 's/.*Duration: \([0-9:.]*\),.*/\1/p' | head -1)"
echo "video: $SRC  duración: $DUR  → $FRAMES cuadros"

# fps = FRAMES / duración. `-vsync 0` para que ffmpeg no duplique ni tire
# cuadros por su cuenta y la numeración quede pareja.
SECS="$(awk -F: '{print ($1*3600)+($2*60)+$3}' <<<"$DUR")"
FPS="$(awk -v f="$FRAMES" -v s="$SECS" 'BEGIN{printf "%.6f", f/s}')"

# Escritorio: 1280×720. El lienzo se dibuja con `cover` y con DPR tope 2, así
# que 1280 de ancho aguanta bien una pantalla de 1440 lógicos sin verse suave.
"$FFMPEG" -hide_banner -loglevel error -y -i "$SRC" \
  -vf "fps=$FPS,scale=1280:720:flags=lanczos" -vsync 0 -q:v 6 \
  "$OUT/desktop/f-%04d.jpg"

# Móvil: encuadre propio, NO el mismo 16:9 en chiquito.
#
# El motivo: el despiece es una composición vertical (agujetas arriba, suela
# hasta abajo) metida en un cuadro horizontal, así que en una pantalla en
# vertical sobra muchísimo negro a los lados y el tenis queda como una tira
# delgada en medio. Se recorta el cuadro a 1200×1080 sobre el 1920×1080
# original — el ancho justo que abarca la pieza más a la izquierda (las
# agujetas del último cuadro, x≈355) y la más a la derecha (el contrafuerte
# del talón, x≈1421) a lo largo de toda la secuencia, con margen.
"$FFMPEG" -hide_banner -loglevel error -y -i "$SRC" \
  -vf "fps=$FPS,crop=1200:1080:288:0,scale=640:576:flags=lanczos" -vsync 0 -q:v 7 \
  "$OUT/mobile/f-%04d.jpg"


# Paso 2: JPEG → WebP y borrado de los JPEG. Los cuadros que consume el sitio
# son .webp, no .jpg — ver src/lib/anatomy-sequence.ts.
node "$ROOT/scripts/anatomy-webp.js"

echo
echo "Recuerda: si cambia el número de cuadros, actualiza frameCount en"
echo "src/lib/anatomy-sequence.ts — es la única fuente de verdad del componente."
