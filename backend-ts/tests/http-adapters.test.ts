import request from 'supertest';
import { createExpressApp } from '../src/infrastructure/http/adapters/express';
import { createLambdaHandler } from '../src/infrastructure/http/adapters/lambda';
import { buildApi } from './helpers';

const csv = 'Correo;RUT;Nombre;Apellido Paterno;Apellido Materno\nana@x.com;1-9;Ana;Paz;Rey\nbeto@x.com;2-7;Beto;Gil;Soto\ncarla@x.com;3-5;Carla;Mar;Sol\n';

describe('adaptadores HTTP', () => {
  it('Express: sube un CSV multipart y reparte alumnos en grupos', async () => {
    const { router } = await buildApi();
    const res = await request(createExpressApp(router))
      .post('/api/groups/assign')
      .field('cantidad_grupos', '2')
      .field('tiene_encabezado', 'true')
      .field('modo', 'secuencial')
      .attach('archivo_lista', Buffer.from(csv), 'lista.csv');

    expect(res.status).toBe(201);
    expect(res.body.grupos.map((g: any) => g.estudiantes.length)).toEqual([2, 1]);
    expect(res.body.grupos[0].codigo_equipo).toMatch(/^\d{7}$/);
  });

  it('Express: responde JSON inválido con 400 y CSV ausente con 400', async () => {
    const { router } = await buildApi();
    const app = createExpressApp(router);
    expect((await request(app).post('/api/login').set('Content-Type', 'application/json').send('{no')).status).toBe(400);
    expect((await request(app).post('/api/groups/assign').field('cantidad_grupos', '2')).body.error).toBe('No se envió ningún archivo CSV');
  });

  it('Lambda: enruta un evento de API Gateway con prefijo /api', async () => {
    const { router } = await buildApi();
    const handler = createLambdaHandler(router);
    const result = await handler({
      httpMethod: 'POST',
      path: '/api/validar-codigo/',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: '123456' }),
      isBase64Encoded: false,
      queryStringParameters: null,
    } as any);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ valido: true });
    expect(result.headers).toMatchObject({ 'Access-Control-Allow-Origin': '*' });
  });
});
