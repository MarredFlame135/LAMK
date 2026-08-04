// src/lib/i18n.ts

export type Language = 'ES' | 'EN';

export const TRANSLATIONS = {
  ES: {
    nav: { sneakers: 'SNEAKERS', apparel: 'ROPA', collectibles: 'COLECCIONABLES', drops: 'DROPS 🔥' },
    product: {
      hypeMeter: 'HYPE METER',
      fitGuide: 'GUÍA DE HORMA',
      addToCart: 'AÑADIR AL CARRITO ESPECIAL',
      notifyBackInStock: 'NOTIFICARME CUANDO VUELVA',
      storytelling: 'HISTORIA DEL MODELO',
      authenticGuarantee: 'PRODUCTO 100% AUTÉNTICO VERIFICADO',
      shippingMexico: 'Envíos a todo México $180 MXN · Entrega Express',
    },
    vault: {
      title: 'MI BÓVEDA & ESTATUS',
      xpLabel: 'PUNTOS XP ACUMULADOS',
      rankGlobal: 'RANKING GLOBAL DE COLECCIONISTAS',
    },
  },
  EN: {
    nav: { sneakers: 'SNEAKERS', apparel: 'APPAREL', collectibles: 'COLLECTIBLES', drops: 'DROPS 🔥' },
    product: {
      hypeMeter: 'HYPE METER',
      fitGuide: 'FIT GUIDE',
      addToCart: 'ADD TO SPECIAL CART',
      notifyBackInStock: 'NOTIFY WHEN BACK IN STOCK',
      storytelling: 'MODEL STORYTELLING',
      authenticGuarantee: '100% VERIFIED AUTHENTIC PRODUCT',
      shippingMexico: 'Shipping worldwide & express delivery in Mexico',
    },
    vault: {
      title: 'MY VAULT & STATUS',
      xpLabel: 'ACCUMULATED XP POINTS',
      rankGlobal: 'GLOBAL COLLECTORS RANKING',
    },
  },
};