// src/lib/vault-reactions.test.ts
//
// La aritmética del contador es la parte que se ve en pantalla y la que más
// fácil se rompe: hay que sumar, restar y CAMBIAR DE BANDO en el mismo clic
// (pasar de "no me gusta" a "me gusta" mueve dos contadores, no uno).
//
// `applyReaction` es la función pura que usa el botón para actualizar de
// inmediato antes de que conteste el servidor. Vive aquí, probada, y no
// suelta dentro del componente: un error aquí se ve como un número que sube
// cuando debía bajar, y nadie lo reporta como bug — solo deja de confiar en
// el contador.

import { describe, it, expect } from 'vitest';
import { applyReaction, isReactionValue } from './vault-reactions-shared';

const vacio = { likes: 0, dislikes: 0, mine: null } as const;

describe('applyReaction', () => {
  it('un me gusta desde cero suma uno', () => {
    expect(applyReaction(vacio, 1)).toEqual({ likes: 1, dislikes: 0, mine: 1 });
  });

  it('un no me gusta desde cero suma uno del otro lado', () => {
    expect(applyReaction(vacio, -1)).toEqual({ likes: 0, dislikes: 1, mine: -1 });
  });

  it('repetir la misma reacción la retira', () => {
    const conLike = { likes: 3, dislikes: 1, mine: 1 as const };
    expect(applyReaction(conLike, 1)).toEqual({ likes: 2, dislikes: 1, mine: null });
  });

  it('cambiar de bando mueve LOS DOS contadores', () => {
    const conLike = { likes: 3, dislikes: 1, mine: 1 as const };
    expect(applyReaction(conLike, -1)).toEqual({ likes: 2, dislikes: 2, mine: -1 });
  });

  it('cambiar de bando en el otro sentido también', () => {
    const conDislike = { likes: 5, dislikes: 2, mine: -1 as const };
    expect(applyReaction(conDislike, 1)).toEqual({ likes: 6, dislikes: 1, mine: 1 });
  });

  it('no toca los totales de otras personas al reaccionar por primera vez', () => {
    const deOtros = { likes: 10, dislikes: 4, mine: null };
    expect(applyReaction(deOtros, 1)).toEqual({ likes: 11, dislikes: 4, mine: 1 });
  });

  // Regresión: ningún camino puede dejar un contador negativo. Si alguna vez
  // se rompe la simetría de sumar/restar, aparece aquí antes que en pantalla.
  it('ningún contador queda negativo, se pulse lo que se pulse', () => {
    const estados = [
      vacio,
      { likes: 1, dislikes: 0, mine: 1 as const },
      { likes: 0, dislikes: 1, mine: -1 as const },
      { likes: 1, dislikes: 1, mine: null },
    ];
    for (const estado of estados) {
      for (const valor of [1, -1] as const) {
        const next = applyReaction(estado, valor);
        expect(next.likes).toBeGreaterThanOrEqual(0);
        expect(next.dislikes).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('alternar dos veces devuelve al estado original', () => {
    const inicial = { likes: 7, dislikes: 2, mine: null };
    expect(applyReaction(applyReaction(inicial, 1), 1)).toEqual(inicial);
  });
});

describe('isReactionValue', () => {
  it('solo acepta 1 y -1', () => {
    expect(isReactionValue(1)).toBe(true);
    expect(isReactionValue(-1)).toBe(true);
  });

  // El cuerpo de la request viene de fuera: cualquier otra cosa se rechaza
  // antes de tocar la base.
  it('rechaza cualquier otro valor que llegue en el body', () => {
    for (const v of [0, 2, -2, '1', true, null, undefined, {}, []]) {
      expect(isReactionValue(v)).toBe(false);
    }
  });
});
