import { Handler } from './types';

/**
 * Canary release (patrón Decorator): `percent`% de las requests van a la versión nueva y el resto a la estable.
 * El header `X-Canary: true|false` fuerza una versión (para QA y la demo); la respuesta indica cuál atendió en `X-Version`.
 */
export const canary =
  (stable: Handler, candidate: Handler, percent: number, random = Math.random): Handler =>
  async (req) => {
    const forced = req.headers['x-canary'];
    const useCanary = forced === 'true' || (forced !== 'false' && random() * 100 < percent);
    const response = await (useCanary ? candidate : stable)(req);
    return { ...response, headers: { ...response.headers, 'X-Version': useCanary ? 'canary' : 'stable' } };
  };
