// src/lib/vault-reactions-shared.ts
//
// La parte de las reacciones que NO toca la base de datos: tipos, la guarda de
// validación y la aritmética del contador.
//
// Está en un archivo aparte de `vault-reactions.ts` por una razón concreta:
// ese otro importa `getDb()`, y el botón de me gusta es un componente de
// cliente. Si importara la función desde ahí, el driver de Postgres entero
// entraría al bundle del navegador. Con este archivo, cliente y servidor
// comparten la MISMA aritmética sin arrastrar nada del servidor al cliente —
// que es justo lo que hace que el número optimista del clic y el número que
// devuelve la API no se puedan contradecir.

export type ReactionValue = 1 | -1;

export interface ReactionSummary {
  likes: number;
  dislikes: number;
  mine: ReactionValue | null; // la de quien mira, nunca la de terceros
}

export function isReactionValue(v: unknown): v is ReactionValue {
  return v === 1 || v === -1;
}

// Qué pasa con los contadores cuando alguien pulsa `value`.
//
// Tres casos, y el tercero es el que se olvida: pulsar lo contrario de lo que
// ya tenías mueve DOS contadores (baja uno y sube el otro), no uno.
export function applyReaction(current: ReactionSummary, value: ReactionValue): ReactionSummary {
  // Pulsar lo mismo que ya tenías retira la reacción.
  const mine: ReactionValue | null = current.mine === value ? null : value;

  return {
    likes: current.likes - (current.mine === 1 ? 1 : 0) + (mine === 1 ? 1 : 0),
    dislikes: current.dislikes - (current.mine === -1 ? 1 : 0) + (mine === -1 ? 1 : 0),
    mine,
  };
}
