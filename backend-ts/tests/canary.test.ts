import { canary } from '../src/infrastructure/http/canary';
import { HttpRequest } from '../src/infrastructure/http/types';
import { buildApi } from './helpers';

const stable = async () => ({ status: 200, body: 'v1' });
const candidate = async () => ({ status: 200, body: 'v2' });
const req = (headers: Record<string, string> = {}): HttpRequest =>
  ({ method: 'GET', path: '/x', query: {}, headers, body: {}, files: {}, params: {} });

describe('canary release', () => {
  it('reparte el tráfico según el porcentaje', async () => {
    expect((await canary(stable, candidate, 0)(req())).body).toBe('v1');
    expect((await canary(stable, candidate, 100)(req())).body).toBe('v2');
    expect((await canary(stable, candidate, 20, () => 0.1)(req())).headers).toEqual({ 'X-Version': 'canary' });
    expect((await canary(stable, candidate, 20, () => 0.5)(req())).headers).toEqual({ 'X-Version': 'stable' });
  });

  it('el header X-Canary fuerza la versión', async () => {
    expect((await canary(stable, candidate, 0)(req({ 'x-canary': 'true' }))).body).toBe('v2');
    expect((await canary(stable, candidate, 100)(req({ 'x-canary': 'false' }))).body).toBe('v1');
  });

  it('GET /equipos v2 agrega codigo_equipo y toda respuesta trae X-App-Version', async () => {
    const { call } = await buildApi();
    const r = await call('GET', '/equipos', {}, {}, { 'x-canary': 'true' });
    expect(r.body[0]).toEqual({ id: 1, nombre: 'Equipo 1', tamanoequipo: 5, codigo_equipo: '1234561' });
    expect(r.headers).toMatchObject({ 'X-Version': 'canary', 'X-App-Version': 'dev' });
  });
});
