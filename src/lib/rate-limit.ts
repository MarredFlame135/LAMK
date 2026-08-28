// src/lib/rate-limit.ts
//
// Límite de intentos en memoria por proceso — sin dependencias nuevas ni
// infraestructura externa (Redis/Upstash). Cierra el hallazgo #2 de la
// auditoría de Fase 1: hoy /api/auth/login, /api/admin/login y /api/otp
// aceptan intentos ilimitados desde cualquier IP, sin ningún costo para
// quien ataca.
//
// Limitación conocida y aceptada (documentada para no repetir el hallazgo):
// en Vercel cada instancia serverless tiene su propia memoria, así que el
// contador se reinicia en cada cold start y no se comparte entre instancias
// concurrentes bajo tráfico alto — no es un rate limit distribuido de
// verdad. Para eso, el siguiente paso sería Vercel KV / Upstash Redis vía
// el marketplace de Vercel — deliberadamente NO se agregó aquí para no
// sumar una dependencia/servicio nuevo sin decidirlo contigo primero. Esto
// sí cierra el hueco real de "cero fricción, intentos infinitos" de hoy.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Limpieza perezosa para no acumular memoria indefinidamente en una
// instancia de larga vida (Fluid Compute reutiliza instancias entre
// requests).
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// IP del request vía los headers que reenvía Vercel. Se combina con una
// clave lógica (ej. email o teléfono) en el caller para no bloquear a todo
// un edificio de oficinas compartiendo IP solo porque UNA persona se
// equivocó de contraseña varias veces.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
