// src/lib/saas-config.ts

export const SAAS_CONFIG = {
  brandName: 'Look At My Kicks MX',
  shortBrandName: 'LAMK MX',
  mascotName: 'TENISIN',
  mascotTagline: 'Tu Concierge Oficial de Kicks & Streetwear',
  mascotGreeting: '¡Hola! Soy TENISIN 👟, ¿encontraste el par que buscabas o te ayudo a cazar uno exclusivo?',
  defaultCurrency: 'MXN',
  supportEmail: 'contacto@lookatmykicks.mx',
  whatsappNumber: '525500000000',

  // Poses e Imágenes de TENISIN según el Estado de la IA (Costo $0)
  //
  // Fix (hallazgo #1 de la auditoría de Fase 3): estos 4 archivos venían
  // directo de Higgsfield sin ningún paso de redimensionado/compresión —
  // 2.5 a 6.4 MB cada uno para mostrarse a 40-56px en Hero/TenisinWidget.
  // Ahora son WebP de 240×240 (headroom de sobra para retina), 17-23 KB
  // cada uno. Regla a futuro: cualquier imagen nueva de Higgsfield pasa por
  // un resize+compress antes de entrar a public/, nunca el archivo tal cual
  // sale del generador.
  mascotPoses: {
    idle: '/assets/branding/tenisin-idle.webp',         // Flotando feliz en la esquina
    thinking: '/assets/branding/tenisin-thinking.webp', // Escaneando / Buscando en inventario
    happy: '/assets/branding/tenisin-happy.webp',       // Celebrando cuando encuentra tu par
    notFound: '/assets/branding/tenisin-notfound.webp', // Sugiriendo alternativos o Back-in-Stock
  },

  // Paleta de Colores "Obsidian & Raw Bone" (rebrand 2026-08-27 v2)
  themeColors: {
    obsidianDark: '#050507',
    rawBoneLight: '#F5F1E8',
    laserCrimson: '#FF1E42',
    mutedGold: '#C5A059',
  },
};