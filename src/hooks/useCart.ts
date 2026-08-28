// src/hooks/useCart.ts
//
// Re-export del hook real, que ahora vive respaldado por CartContext (ver
// src/context/CartContext.tsx para el porqué). Se deja este archivo para no
// romper los 5 imports existentes (`@/hooks/useCart`) — mover el contexto
// no debe implicar tocar cada componente que ya lo usa.

export { useCart } from '@/context/CartContext';
