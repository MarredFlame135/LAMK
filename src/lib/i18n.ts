// src/lib/i18n.ts

export type Language = 'ES' | 'EN';

export const TRANSLATIONS = {
  ES: {
    nav: {
      sneakers: 'SNEAKERS', apparel: 'ROPA', collectibles: 'COLECCIONABLES', drops: 'DROPS',
      home: 'INICIO', catalog: 'CATÁLOGO', vault: 'BÓVEDA',
      login: 'INICIAR SESIÓN', logout: 'Salir', hello: 'HOLA,',
    },
    hero: {
      badge: 'PLATAFORMA PWA NEXT-GEN',
      // El titular pasó de tres líneas a UNA (2026-09-03, decisión del
      // cliente). Antes decía "CONSTRUYES UN CLUB / DE COLECCIONISTAS. /
      // Bienvenido al Club LAMK." — la tercera línea ya decía lo mismo que
      // las dos primeras, solo que mejor: corta, en segunda persona y con el
      // nombre de la marca dentro. Se quedó esa y se fueron las otras dos.
      //
      // (Antes de esas tres estuvo "NO VENDES TENIS.", retirada porque
      // nombraba la categoría que MENOS pesa en el catálogo real: de 265
      // piezas, 114 son accesorios y solo 75 son sneakers.)
      headline: 'BIENVENIDO AL CLUB LAMK',
      subtitle: 'Sneakers, ropa, gorras, bolsos y joyería. Cada pieza que compras entra a tu Bóveda con número de serie, suma XP y desbloquea rangos y drops antes que a nadie.',
      ctaCatalog: 'VER CATÁLOGO EXCLUSIVO →',
    },
    anatomy: {
      eyebrow: '// ANATOMÍA DE UN PAR VERIFICADO',
      title: 'LO ABRIMOS ANTES QUE TÚ.',
      imageAlt: 'Vista de despiece de un sneaker: agujetas, lengüeta, corte, plantilla, entresuela y suela separados en el aire.',
      beat1Title: 'ENSAMBLADO',
      beat1Body: 'Así llega el par a la foto. Así llega a tu casa. Todo lo que pasa entre una cosa y la otra es esto.',
      beat2Title: 'DESPIECE',
      beat2Body: 'Corte, lengüeta, agujetas, plantilla, entresuela y suela. Cada capa se revisa por separado, no de un vistazo.',
      beat3Title: 'VERIFICADO',
      beat3Body: 'Costuras, densidad de la espuma, dibujo de la suela y códigos internos. Si una capa no cuadra, el par no se publica.',
      playCta: 'VER EL DESPIECE COMPLETO',
      reducedMotionNote: 'Tu sistema pide menos movimiento — por eso se muestra fijo.',
    },
    catalogPage: {
      eyebrow: '// DROPS & INVENTARIO REAL',
      title: 'CATÁLOGO EXCLUSIVO',
      all: 'TODOS',
      empty: 'No hay productos en esta categoría por ahora.',
      soldOut: 'AGOTADO',
      addToCart: '+ AÑADIR A LA SELECCIÓN',
      size: 'Talla',
    },
    cart: {
      title: 'TU SELECCIÓN',
      empty: 'TU CARRITO ESTÁ VACÍO',
      emptyHint: 'Explora el catálogo y asegura tu par antes de que se agote.',
      freeShippingRemaining: 'Te faltan',
      freeShippingRemainingTail: 'para Envío Gratis',
      freeShippingUnlocked: 'ENVÍO GRATIS Y BENEFICIO VIP DESBLOQUEADO',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      free: 'GRATIS',
      total: 'TOTAL ESTIMADO',
      remove: 'Eliminar',
      proceedToPay: 'PROCEDER AL PAGO SEGURO',
      encryptedFooter: 'Pagos 100% encriptados vía Shopify Checkout',
    },
    product: {
      hypeMeter: 'HYPE INDEX',
      fitGuide: 'GUÍA DE HORMA',
      addToCart: 'AÑADIR A LA SELECCIÓN',
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
    nav: {
      sneakers: 'SNEAKERS', apparel: 'APPAREL', collectibles: 'COLLECTIBLES', drops: 'DROPS',
      home: 'HOME', catalog: 'CATALOG', vault: 'VAULT',
      login: 'LOG IN', logout: 'Log out', hello: 'HI,',
    },
    hero: {
      badge: 'NEXT-GEN PWA PLATFORM',
      headline: 'WELCOME TO CLUB LAMK',
      subtitle: 'Sneakers, apparel, caps, bags and jewelry. Every piece you buy enters your Vault with a serial number, earns XP, and unlocks ranks and drops before anyone else.',
      ctaCatalog: 'SEE EXCLUSIVE CATALOG →',
    },
    anatomy: {
      eyebrow: '// ANATOMY OF A VERIFIED PAIR',
      title: 'WE OPEN IT BEFORE YOU DO.',
      imageAlt: 'Exploded view of a sneaker: laces, tongue, upper, insole, midsole and outsole separated in mid-air.',
      beat1Title: 'ASSEMBLED',
      beat1Body: 'This is how the pair reaches the photo. This is how it reaches your door. Everything in between is this.',
      beat2Title: 'TAKEN APART',
      beat2Body: 'Upper, tongue, laces, insole, midsole and outsole. Every layer gets checked on its own, not at a glance.',
      beat3Title: 'VERIFIED',
      beat3Body: 'Stitching, foam density, tread pattern and internal codes. If one layer does not add up, the pair never goes live.',
      playCta: 'PLAY THE FULL BREAKDOWN',
      reducedMotionNote: 'Your system asks for reduced motion — that is why this is still.',
    },
    catalogPage: {
      eyebrow: '// DROPS & REAL INVENTORY',
      title: 'EXCLUSIVE CATALOG',
      all: 'ALL',
      empty: 'No products in this category yet.',
      soldOut: 'SOLD OUT',
      addToCart: '+ ADD TO SELECTION',
      size: 'Size',
    },
    cart: {
      title: 'YOUR SELECTION',
      empty: 'YOUR CART IS EMPTY',
      emptyHint: 'Browse the catalog and secure your pair before it sells out.',
      freeShippingRemaining: 'You need',
      freeShippingRemainingTail: 'more for Free Shipping',
      freeShippingUnlocked: 'FREE SHIPPING & VIP PERK UNLOCKED',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      free: 'FREE',
      total: 'ESTIMATED TOTAL',
      remove: 'Remove',
      proceedToPay: 'PROCEED TO SECURE PAYMENT',
      encryptedFooter: '100% encrypted payments via Shopify Checkout',
    },
    product: {
      hypeMeter: 'HYPE INDEX',
      fitGuide: 'FIT GUIDE',
      addToCart: 'ADD TO SELECTION',
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
