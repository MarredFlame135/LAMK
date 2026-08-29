// src/lib/social/profile-view.test.ts
//
// Camino crítico: controles de privacidad de perfil (el que la Fase 7 dejó
// explícitamente sin cubrir porque este código no existía todavía). Cubre
// solo `canView()` — la función pura que decide qué se muestra, sin tocar
// la base de datos real (eso se verificó aparte con un smoke test manual
// contra Neon, ver mensaje de esta ronda).
//
// Incluye una prueba de regresión explícita para un bug real que se
// encontró y corrigió mientras se construía esto mismo: la primera versión
// exigía que quien escanea un QR YA fuera un "follower" en la base de
// datos, lo cual es imposible para un escaneo anónimo — habría bloqueado
// el escaneo de QR por completo, siempre.

import { describe, it, expect } from 'vitest';
import { canView } from './profile-view';

describe('canView', () => {
  it('el dueño siempre ve su propio perfil, sin importar la visibilidad', () => {
    expect(canView('private', 'owner', false)).toBe(true);
    expect(canView('public', 'owner', false)).toBe(true);
  });

  it('perfil público: cualquier desconocido lo ve', () => {
    expect(canView('public', 'stranger', false)).toBe(true);
  });

  it('perfil de solo-seguidores: un desconocido NO lo ve, un seguidor sí', () => {
    expect(canView('followers', 'stranger', false)).toBe(false);
    expect(canView('followers', 'follower', false)).toBe(true);
  });

  it('perfil privado: nadie más que el dueño lo ve', () => {
    expect(canView('private', 'stranger', false)).toBe(false);
    expect(canView('private', 'follower', false)).toBe(false);
  });

  it('REGRESIÓN: escanear el QR de un perfil público SÍ debe funcionar, aunque quien escanea sea un desconocido anónimo (relation=stranger, no puede "ya ser follower")', () => {
    expect(canView('public', 'stranger', true)).toBe(true);
    expect(canView('followers', 'stranger', true)).toBe(true);
  });

  it('escanear el QR de un perfil privado NO funciona (el QR nunca se genera para perfiles privados, pero por si acaso)', () => {
    expect(canView('private', 'stranger', true)).toBe(false);
  });
});
