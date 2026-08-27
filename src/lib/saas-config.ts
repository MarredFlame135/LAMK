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
  mascotPoses: {
    idle: '/assets/branding/tenisin-idle.png',         // Flotando feliz en la esquina
    thinking: '/assets/branding/tenisin-thinking.png', // Escaneando / Buscando en inventario
    happy: '/assets/branding/tenisin-happy.png',       // Celebrando cuando encuentra tu par
    notFound: '/assets/branding/tenisin-notfound.png', // Sugiriendo alternativos o Back-in-Stock
  },

  // Paleta de Colores "Obsidian & Raw Bone" (rebrand 2026-08-27 v2)
  themeColors: {
    obsidianDark: '#050507',
    rawBoneLight: '#F5F1E8',
    laserCrimson: '#FF1E42',
    mutedGold: '#C5A059',
  },
};