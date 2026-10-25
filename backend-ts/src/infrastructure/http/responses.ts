import { statusFor } from './router';
import { HttpResponse } from './types';

export const ok = (body: unknown, status = 200): HttpResponse => ({ status, body });
export const noContent = (): HttpResponse => ({ status: 204 });

/** Error con el formato `{ error }` usado por la mayoría de los endpoints. */
export const fail = (error: unknown): HttpResponse => ({
  status: statusFor(error),
  body: { error: error instanceof Error ? error.message : 'Error interno' },
});

/** Error con el formato `{ success: false, error }` usado por el módulo admin. */
export const failAdmin = (error: unknown): HttpResponse => ({
  status: statusFor(error),
  body: { success: false, error: error instanceof Error ? error.message : 'Error interno' },
});

export const positiveInt = (value: string): number => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};
