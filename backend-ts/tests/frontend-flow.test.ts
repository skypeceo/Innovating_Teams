import { buildApi } from './helpers';

// Reproduce, endpoint por endpoint, las llamadas que hace el frontend React.
describe('contrato HTTP con el frontend', () => {
  let call: Awaited<ReturnType<typeof buildApi>>['call'];
  beforeEach(async () => {
    ({ call } = await buildApi());
  });

  it('login admin y profesor devuelven token, username y role', async () => {
    const admin = await call('POST', '/login/admin', { email: 'admin@demo.com', password: 'admin-demo-123' });
    expect(admin.status).toBe(200);
    expect(admin.body).toEqual({ token: expect.any(String), username: 'Admin', role: 'ADMINISTRADOR' });

    const prof = await call('POST', '/login/profesor', { email: 'profesor@demo.com', password: 'profesor-demo-123' });
    expect(prof.body.role).toBe('PROFESOR');
  });

  it('login rechaza credenciales inválidas (400) y rol incorrecto (403)', async () => {
    expect((await call('POST', '/login/admin', { email: 'admin@demo.com', password: 'mala' })).status).toBe(400);
    expect((await call('POST', '/login/admin', { email: 'nadie@demo.com', password: 'x' })).body.error).toBe('Usuario no encontrado');
    const forbidden = await call('POST', '/login/admin', { email: 'profesor@demo.com', password: 'profesor-demo-123' });
    expect(forbidden.status).toBe(403);
  });

  it('flujo profesor → estudiantes: crear partida, asignar grupos, validar equipo, obtener grupos, iniciar juego', async () => {
    const partida = await call('POST', '/crear-partida', { max_equipos: 2 });
    expect(partida.status).toBe(201);
    expect(partida.body).toMatchObject({ estado: 'CONFIGURACION', maxEquipos: 2, maxParticipantes: 20 });
    expect(partida.body.codigoAcceso).toMatch(/^\d{6}$/);

    const asignar = await call('POST', `/partida/${partida.body.id}/asignar-grupos`, {
      grupos: [
        { nombre: 'Los Pioneros', alumnos: [{ id_correo_usuario: 'a@x.com', primer_nombre: 'Ana', apellido_paterno: 'Paz', apellido_materno: 'Rey' }] },
      ],
    });
    expect(asignar.status).toBe(201);
    const codigoEquipo = asignar.body.grupos_creados[0].codigo_equipo;
    expect(codigoEquipo).toBe(`${partida.body.codigoAcceso}1`);

    // antes de conectarse el equipo no expone sus alumnos
    const antes = await call('GET', `/partida/${partida.body.id}/obtener-grupos`);
    expect(antes.body.grupos[0].usuarios).toEqual([]);

    const validar = await call('POST', '/validar-equipo', { codigo: codigoEquipo });
    expect(validar.status).toBe(200);
    expect(validar.body).toMatchObject({ valido: true, equipo_nombre: 'Los Pioneros', equipo_numero: 1, estado_partida: 'CONFIGURACION' });

    const despues = await call('GET', `/partida/${partida.body.id}/obtener-grupos`);
    expect(despues.body.grupos[0].usuarios).toEqual([{ correo: 'a@x.com', nombre: 'Ana', apellido: 'Paz Rey' }]);

    expect((await call('GET', `/partida/${partida.body.id}/estado-actual`)).body).toEqual({
      estado_actual: 'CONFIGURACION',
      fase_actual: 0,
      timestamp: null,
    });
    const inicio = await call('POST', `/partida/${partida.body.id}/iniciar-juego`);
    expect(inicio.body).toMatchObject({ success: true, estado_actual: 'INICIADA', fase_actual: 1 });
    expect((await call('GET', `/partida/${partida.body.id}/estado-actual`)).body.estado_actual).toBe('INICIADA');
  });

  it('validar-codigo y validar-equipo aplican las mismas validaciones que Django', async () => {
    expect((await call('POST', '/validar-codigo', { codigo: '12' })).status).toBe(400);
    expect((await call('POST', '/validar-codigo', { codigo: '999999' })).status).toBe(404);
    expect((await call('POST', '/validar-codigo', { codigo: '123456' })).body).toMatchObject({ valido: true, estado: 'CONFIGURACION' });
    expect((await call('POST', '/validar-equipo', { codigo: '123456' })).status).toBe(400);
    expect((await call('POST', '/validar-equipo', { codigo: '9999991' })).status).toBe(404);
  });

  it('unirse-equipo registra al alumno y es idempotente', async () => {
    const body = { codigo_equipo: '1234561', nombre: 'Juan', apellido: 'Pérez', correo: 'juan@x.com' };
    const primero = await call('POST', '/unirse-equipo', body);
    expect(primero.status).toBe(200);
    expect(primero.body).toMatchObject({ success: true, equipo_nombre: 'Equipo 1', partida_id: 1 });
    expect(primero.body.mensaje).toContain('Te has unido');
    const segundo = await call('POST', '/unirse-equipo', body);
    expect(segundo.body.usuario_id).toBe(primero.body.usuario_id);
    expect(segundo.body.mensaje).toContain('Bienvenido de nuevo');
    expect((await call('POST', '/unirse-equipo', { ...body, codigo_equipo: '12' })).status).toBe(400);
  });

  it('guardar y obtener imagen de solución', async () => {
    expect((await call('POST', '/guardar-imagen', { equipo_id: 1 })).status).toBe(400);
    expect((await call('POST', '/guardar-imagen', { equipo_id: 99, image_url: 'u' })).status).toBe(404);
    const guardada = await call('POST', '/guardar-imagen', { equipo_id: 1, image_url: 'https://storage.googleapis.com/b/1.png' });
    expect(guardada.body).toMatchObject({ success: true, created: true });
    expect((await call('POST', '/guardar-imagen', { equipo_id: 1, image_url: 'https://storage.googleapis.com/b/2.png' })).body.created).toBe(false);
    expect((await call('GET', '/obtener-imagen', {}, { team_id: '1' })).body).toMatchObject({ has_image: true, image_url: 'https://storage.googleapis.com/b/2.png' });
    expect((await call('GET', '/obtener-imagen', {}, { team_id: '2' })).body).toMatchObject({ success: false, has_image: false });
    expect((await call('GET', '/obtener-imagen')).status).toBe(400);
  });

  it('signed-url responde en ambas rutas con el formato esperado', async () => {
    const r = await call('GET', '/signed-url', {}, { grupoId: '3', ext: 'jpg' });
    expect(r.body).toMatchObject({ expires_in: 3600, uploadUrl: expect.stringContaining('soluciones/group_3_'), publicUrl: expect.any(String) });
    expect((await call('GET', '/storage/signed-url', {}, { ext: 'png' })).status).toBe(200);
  });

  it('admin exige token de administrador (401 sin token, 403 con otro rol)', async () => {
    expect((await call('GET', '/admin/temas')).status).toBe(401);
    expect((await call('GET', '/admin/temas', {}, {}, { authorization: 'Token falso' })).status).toBe(401);
    const prof = await call('POST', '/login/profesor', { email: 'profesor@demo.com', password: 'profesor-demo-123' });
    const r = await call('GET', '/admin/temas', {}, {}, { authorization: `Token ${prof.body.token}` });
    expect(r.status).toBe(403);
    expect(r.body.success).toBe(false);
  });

  it('CRUD admin de temas y desafíos con paginación y soft delete', async () => {
    const login = await call('POST', '/login/admin', { email: 'admin@demo.com', password: 'admin-demo-123' });
    const auth = { authorization: `Token ${login.body.token}` };
    const admin = (method: string, path: string, body: Record<string, unknown> = {}, query: Record<string, string> = {}) =>
      call(method, path, body, query, auth);

    const temas = await admin('GET', '/admin/temas');
    expect(temas.body.data[0]).toMatchObject({ nombretema: 'Sostenibilidad Ambiental', total_desafios: 1 });

    const nuevo = await admin('POST', '/admin/temas', { nombretema: 'Salud', descripcion: 'Bienestar' });
    expect(nuevo.status).toBe(201);
    expect((await admin('POST', '/admin/temas', { nombretema: 'salud', descripcion: 'dup' })).body.error).toBe('Ya existe un tema con ese nombre');

    const desafios = await admin('GET', '/admin/desafios', {}, { page: '1', limit: '5', search: 'residuos' });
    expect(desafios.body.data.pagination).toEqual({ page: 1, limit: 5, total: 1, pages: 1 });
    expect(desafios.body.data.desafios[0]).toMatchObject({ tema_nombre: 'Sostenibilidad Ambiental', persona_nombre: 'Arquetipo 1' });

    const del = await admin('DELETE', '/admin/temas/1');
    expect(del.status).toBe(400);
    expect(del.body.error).toContain('1 desafío(s) activo(s)');

    expect((await admin('DELETE', '/admin/desafios/1')).status).toBe(200);
    expect((await admin('DELETE', '/admin/temas/1')).body.success).toBe(true);
    expect((await admin('GET', '/admin/temas/1')).body.data.estado).toBe('INACTIVO');

    const personas = await admin('GET', '/admin/personas');
    expect(personas.body.data[0]).toMatchObject({ nombre: 'Arquetipo 1', edad: 67 });
    expect((await admin('POST', '/admin/personas', { nombre: 'X', edad: 'abc' })).status).toBe(400);
  });

  it('CRUD estilo DRF para videos y usuarios', async () => {
    const creado = await call('POST', '/videos', { nombrevideo: 'Intro', url: 'https://v/1' });
    expect(creado.status).toBe(201);
    expect(creado.body).toEqual({ id: 1, nombrevideo: 'Intro', url: 'https://v/1', partida: null });
    expect((await call('POST', '/videos', { nombrevideo: 'x' })).body).toEqual({ url: ['This field is required.'] });
    expect((await call('PATCH', '/videos/1', { url: 'https://v/2' })).body.url).toBe('https://v/2');
    expect((await call('DELETE', '/videos/1')).status).toBe(204);
    expect((await call('GET', '/videos/1')).body).toEqual({ detail: 'Not found.' });

    const dup = await call('POST', '/usuarios', { email: 'admin@demo.com', nombre: 'a', apellido: 'b', tipousuario: 'X' });
    expect(dup.status).toBe(400);
  });

  it('bulk_create, equipos y estudiantes por equipo', async () => {
    const bulk = await call('POST', '/estudiantes/bulk_create', {
      estudiantes: [{ correo: 'b@x.com', nombre: 'Beto', apellido_paterno: 'Gil', apellido_materno: 'Soto', rut: '1-9' }, { nombre: 'sin correo' }],
    });
    expect(bulk.status).toBe(201);
    expect(bulk.body).toMatchObject({ total: 1, estudiantes: [{ correo: 'b@x.com', apellido: 'Gil Soto', nuevo: true }] });
    expect((await call('POST', '/estudiantes/bulk_create', {})).status).toBe(400);

    // X-Canary: false fuerza la versión estable (por defecto el 20% va a la v2)
    expect((await call('GET', '/equipos', {}, {}, { 'x-canary': 'false' })).body).toEqual([
      { id: 1, nombre: 'Equipo 1', tamanoequipo: 5 },
      { id: 2, nombre: 'Equipo 2', tamanoequipo: 5 },
    ]);

    await call('POST', '/unirse-equipo', { codigo_equipo: '1234561', nombre: 'Juan', apellido: 'Pérez', correo: 'juan@x.com' });
    // unirse-equipo crea usuario pero no Estudiante; los alumnos del bulk sí lo son
    expect((await call('GET', '/equipos/1/estudiantes')).body).toEqual([]);
  });

  it('CORS, preflight, 404 y 405', async () => {
    const preflight = await call('OPTIONS', '/login');
    expect(preflight.status).toBe(204);
    expect(preflight.headers).toMatchObject({ 'Access-Control-Allow-Origin': '*' });
    expect((await call('GET', '/no-existe')).status).toBe(404);
    expect((await call('GET', '/crear-partida')).status).toBe(405);
  });

  it('GET /endpoints lista todas las rutas registradas', async () => {
    const r = await call('GET', '/endpoints');
    expect(r.body).toContainEqual({ method: 'POST', path: '/api/login' });
    expect(r.body).toContainEqual({ method: 'GET', path: '/api/partida/:partidaId/estado-actual' });
    expect(r.body.length).toBeGreaterThan(50);
  });

  it('tolera barra final como Django (/login/admin/)', async () => {
    expect((await call('POST', '/login/admin/', { email: 'admin@demo.com', password: 'admin-demo-123' })).status).toBe(200);
  });
});
