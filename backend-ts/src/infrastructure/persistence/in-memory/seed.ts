import { PasswordHasher } from '../../../application/ports/services';
import { Repositories } from '../../../main/container';

/** Datos mínimos para desarrollo local; las contraseñas se pueden sobrescribir por entorno. */
export const seedDevelopmentData = async (repos: Repositories, hasher: PasswordHasher): Promise<void> => {
  const now = new Date();
  const passwordFor = (envName: string, fallback: string) => process.env[envName] ?? fallback;

  const cuenta = (email: string, nombre: string, tipoUsuario: string, password: string) =>
    hasher.hash(password).then((passwordHash) =>
      repos.usuarios.create({
        email,
        nombre,
        apellido: 'Demo',
        tipoUsuario,
        fechaCreacion: now,
        estado: 'ACTIVO',
        isActive: true,
        passwordHash,
      }),
    );

  await cuenta('admin@demo.com', 'Admin', 'ADMINISTRADOR', passwordFor('SEED_ADMIN_PASSWORD', 'admin-demo-123'));
  await cuenta('profesor@demo.com', 'Profesor', 'PROFESOR', passwordFor('SEED_PROFESOR_PASSWORD', 'profesor-demo-123'));

  const partida = await repos.partidas.create({
    fechaCreacion: now,
    estado: 'CONFIGURACION',
    codigoAcceso: '123456',
    fechaInicio: null,
    fechaFin: null,
    maxEquipos: 4,
    maxParticipantes: 20,
  });
  for (const [i, nombre] of ['Equipo 1', 'Equipo 2'].entries()) {
    await repos.equipos.create({ nombreEquipo: nombre, tamanoEquipo: 5, codigoEquipo: `${partida.codigoAcceso}${i + 1}` });
  }

  const tema = await repos.temas.create({
    nombreTema: 'Sostenibilidad Ambiental',
    descripcion: 'Crear soluciones para reducir el impacto ecológico',
    estado: 'ACTIVO',
  });
  const persona = await repos.personas.create({
    nombrePersona: 'Arquetipo 1',
    imagenUrl: '',
    contextoPersona: 'Persona de ejemplo para desafíos',
    edad: 67,
  });
  await repos.desafios.create({
    temaDesafioId: tema.id,
    fechaCreacion: now,
    titulo: 'Reducir residuos en el hogar',
    descripcion: 'Diseña una solución para separar residuos',
    nombrePersona: persona.nombrePersona,
    edadPersona: persona.edad,
    contexto: persona.contextoPersona,
    estado: 'ACTIVO',
    personaId: persona.id,
  });
};
