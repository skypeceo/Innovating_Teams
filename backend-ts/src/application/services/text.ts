/** Normaliza un valor de entrada arbitrario a string recortado ('' si no es texto). */
export const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
