// scripts/anatomy-webp.js
//
// Segundo paso de `scripts/anatomy-frames.sh`: convierte a WebP los JPEG que
// dejó ffmpeg y borra los JPEG. Es la regla de la Fase 3 de la auditoría
// (ver CLAUDE.md) aplicada a los 192 cuadros del despiece: ninguna imagen
// entra a `public/` sin comprimir.
//
// Medido en este set: 48 KB por cuadro en JPEG q6 contra 35 KB en WebP q76,
// misma percepción de calidad sobre fondo negro — ~1.3 MB menos en el juego
// de escritorio completo.
//
// `sharp` NO es dependencia de este proyecto a propósito: solo se usa para
// generar assets una vez, no en el build ni en el runtime del sitio. Se toma
// prestado de donde ya esté instalado:
//
//   SHARP_PATH=C:/ruta/a/node_modules/sharp node scripts/anatomy-webp.js
//
// Si no hay ninguno, `npx --yes sharp-cli` o un `npm i -D sharp` temporal
// (desinstalándolo después) también sirven — pero no lo dejes en
// package.json, el sitio no lo necesita para correr.

const fs = require('fs');
const path = require('path');

const SHARP_PATH = process.env.SHARP_PATH || 'sharp';
let sharp;
try {
  sharp = require(SHARP_PATH);
} catch {
  console.error(
    `No se pudo cargar sharp desde "${SHARP_PATH}".\n` +
    'Pásale la ruta de un sharp ya instalado:\n' +
    '  SHARP_PATH=C:/ruta/proyecto/node_modules/sharp node scripts/anatomy-webp.js'
  );
  process.exit(1);
}

// Submuestreo inteligente en los dos: los degradados naranjas sobre negro son
// justo donde el WebP hace banding, y es casi toda esta foto.
// Escritorio a 76 porque el cuadro se ve a pantalla completa. Móvil puede
// bajar a 68 sin que se note: el cuadro ya se dibuja a ~390 px de ancho y el
// juego completo pesa ~1.1 MB menos, que en datos móviles sí importa.
const QUALITY = { desktop: 76, mobile: 68 };

async function convertDir(dir, quality) {
  const abs = path.join(__dirname, '..', 'public', 'assets', 'anatomy', dir);
  const files = fs.readdirSync(abs).filter((f) => f.endsWith('.jpg')).sort();
  let before = 0;
  let after = 0;

  for (const file of files) {
    const src = path.join(abs, file);
    // Se lee a memoria en vez de pasarle la ruta a sharp: en Windows, sharp
    // deja el archivo abierto un rato después de convertir y el unlink de
    // abajo truena con EPERM.
    const buf = fs.readFileSync(src);
    before += buf.length;
    const out = src.replace(/\.jpg$/, '.webp');
    await sharp(buf).webp({ quality, effort: 5, smartSubsample: true }).toFile(out);
    after += fs.statSync(out).size;
    fs.unlinkSync(src);
  }

  const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;
  console.log(`${dir}: ${files.length} cuadros — ${mb(before)} → ${mb(after)}`);
}

(async () => {
  await convertDir('desktop', QUALITY.desktop);
  await convertDir('mobile', QUALITY.mobile);

  // El cuadro fijo de prefers-reduced-motion sale del último de escritorio.
  const dir = path.join(__dirname, '..', 'public', 'assets', 'anatomy');
  const last = fs.readdirSync(path.join(dir, 'desktop')).sort().pop();
  fs.copyFileSync(path.join(dir, 'desktop', last), path.join(dir, 'exploded-still.webp'));
  for (const stale of ['exploded-still.jpg']) {
    const p = path.join(dir, stale);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log(`fijo (reduced-motion): exploded-still.webp (copia de ${last})`);
})();
