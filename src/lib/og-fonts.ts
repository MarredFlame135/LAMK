// src/lib/og-fonts.ts
//
// Fix (hallazgo #1 de la auditoría "Prompt Maestro v4", Fase A): carga las
// mismas familias de marca (Space Grotesk, JetBrains Mono) dentro de
// `ImageResponse` (next/og), que corre en Edge y NO puede usar
// `next/font/google` normal (eso es un plugin de build, no algo que exista
// en runtime). El truco del User-Agent viejo es necesario porque Google
// Fonts sirve WOFF2 por default — Satori (el motor detrás de ImageResponse)
// solo soporta TTF/OTF/WOFF, no WOFF2 — un User-Agent de navegador antiguo
// hace que Google Fonts responda con TTF.
const LEGACY_UA =
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';

async function fetchGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
    { headers: { 'User-Agent': LEGACY_UA } },
  ).then((res) => res.text());

  const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error(`No se pudo resolver la URL de fuente para ${family} ${weight}`);

  return fetch(fontUrl).then((res) => res.arrayBuffer());
}

// Solo las dos familias que se usan como placa técnica en las imágenes OG —
// Inter (cuerpo) no hace falta en superficies tan cortas de texto.
export async function loadBrandOgFonts() {
  const [spaceGroteskBold, jetBrainsMonoMedium, jetBrainsMonoBold] = await Promise.all([
    fetchGoogleFont('Space Grotesk', 700),
    fetchGoogleFont('JetBrains Mono', 500),
    fetchGoogleFont('JetBrains Mono', 700),
  ]);

  return [
    { name: 'Space Grotesk', data: spaceGroteskBold, weight: 700 as const, style: 'normal' as const },
    { name: 'JetBrains Mono', data: jetBrainsMonoMedium, weight: 500 as const, style: 'normal' as const },
    { name: 'JetBrains Mono', data: jetBrainsMonoBold, weight: 700 as const, style: 'normal' as const },
  ];
}
