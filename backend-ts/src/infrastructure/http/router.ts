import { DomainError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors';
import { Handler, HttpRequest, HttpResponse } from './types';

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

const split = (path: string) => path.split('/').filter(Boolean);

const corsHeaders = (origin: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,Accept',
});

export const statusFor = (error: unknown): number => {
  if (error instanceof ValidationError) return 400;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof DomainError) return 400;
  return 500;
};

/** Router independiente del framework: Express y Lambda lo invocan con un HttpRequest. */
export class Router {
  private readonly routes: Route[] = [];

  constructor(private readonly corsOrigin = '*') {}

  add(method: string, pattern: string, handler: Handler): this {
    this.routes.push({ method, segments: split(pattern), handler });
    return this;
  }

  async handle(request: Omit<HttpRequest, 'params'>): Promise<HttpResponse> {
    const cors = corsHeaders(this.corsOrigin);
    if (request.method === 'OPTIONS') return { status: 204, headers: cors };

    const response = await this.dispatch(request);
    return { ...response, headers: { 'Content-Type': 'application/json', ...cors, ...response.headers } };
  }

  private async dispatch(request: Omit<HttpRequest, 'params'>): Promise<HttpResponse> {
    const segments = split(request.path);
    let pathMatched = false;

    for (const route of this.routes) {
      const params = this.match(route.segments, segments);
      if (!params) continue;
      pathMatched = true;
      if (route.method !== request.method) continue;
      try {
        return await route.handler({ ...request, params });
      } catch (error) {
        return this.unhandled(error);
      }
    }
    return pathMatched
      ? { status: 405, body: { error: 'Método no permitido' } }
      : { status: 404, body: { detail: 'Not found.' } };
  }

  private match(pattern: string[], actual: string[]): Record<string, string> | null {
    if (pattern.length !== actual.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i].startsWith(':')) params[pattern[i].slice(1)] = decodeURIComponent(actual[i]);
      else if (pattern[i] !== actual[i]) return null;
    }
    return params;
  }

  private unhandled(error: unknown): HttpResponse {
    console.error(error);
    return { status: 500, body: { error: error instanceof Error ? error.message : 'Error interno' } };
  }
}
