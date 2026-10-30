import { Handler } from './types';

export const canary =
  (stable: Handler, candidate: Handler, percent: number, random = Math.random): Handler =>
  async (req) => {
    const forced = req.headers['x-canary'];
    const useCanary = forced === 'true' || (forced !== 'false' && random() * 100 < percent);
    const response = await (useCanary ? candidate : stable)(req);
    return { ...response, headers: { ...response.headers, 'X-Version': useCanary ? 'canary' : 'stable' } };
  };
