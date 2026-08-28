// src/lib/otp.test.ts
//
// Camino crítico #2 del brief (autorización), aplicado al flujo de
// verificación de WhatsApp (hallazgo #4 de la Fase 1: antes esta
// verificación corría 100% en el cliente y era trivialmente falsificable —
// ver docs/audit/FASE-1-SEGURIDAD.md). Prueba que el ticket firmado de
// verdad ata código+teléfono, y que nada de esto puede falsificarse sin el
// secreto del servidor.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signOtpTicket, verifyOtpTicket } from './otp';

const ORIGINAL_SECRET = process.env.OTP_SESSION_SECRET;

describe('signOtpTicket / verifyOtpTicket', () => {
  beforeEach(() => {
    process.env.OTP_SESSION_SECRET = 'test-secret-otp-no-usar-en-prod';
  });

  afterEach(() => {
    process.env.OTP_SESSION_SECRET = ORIGINAL_SECRET;
  });

  it('el código correcto, para el teléfono correcto, verifica', async () => {
    const ticket = await signOtpTicket('5512345678', '4321');
    expect(await verifyOtpTicket(ticket, '5512345678', '4321')).toBe(true);
  });

  it('un código incorrecto NO verifica', async () => {
    const ticket = await signOtpTicket('5512345678', '4321');
    expect(await verifyOtpTicket(ticket, '5512345678', '0000')).toBe(false);
  });

  it('el ticket correcto usado con OTRO teléfono no verifica (no es transferible)', async () => {
    const ticket = await signOtpTicket('5512345678', '4321');
    expect(await verifyOtpTicket(ticket, '5599998888', '4321')).toBe(false);
  });

  it('un ticket ausente/vacío no verifica', async () => {
    expect(await verifyOtpTicket(undefined, '5512345678', '4321')).toBe(false);
    expect(await verifyOtpTicket('', '5512345678', '4321')).toBe(false);
  });

  it('un ticket con la firma alterada no verifica', async () => {
    const ticket = await signOtpTicket('5512345678', '4321');
    const [payload] = ticket.split('.');
    const tampered = `${payload}.firmaInventada`;
    expect(await verifyOtpTicket(tampered, '5512345678', '4321')).toBe(false);
  });

  it('un ticket con más de 5 minutos expira', async () => {
    vi.useFakeTimers();
    try {
      const ticket = await signOtpTicket('5512345678', '4321');
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutos después
      expect(await verifyOtpTicket(ticket, '5512345678', '4321')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
