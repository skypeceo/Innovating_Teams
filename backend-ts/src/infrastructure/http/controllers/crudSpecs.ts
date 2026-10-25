import { EstudianteRepository, ListaParticipanteRepository, UsuarioRepository } from '../../../application/ports/repositories';
import { Clock } from '../../../application/ports/services';
import { Curso, Video } from '../../../domain/entities/Contenido';
import { Estudiante, Usuario } from '../../../domain/entities/Usuario';
import { cursoJson, estudianteDetailJson, usuarioJson, videoJson } from '../presenters';
import { CrudSpec } from './CrudController';

export const videoSpec: CrudSpec<Video> = {
  fields: [
    { json: 'nombrevideo', prop: 'nombreVideo', kind: 'string', required: true },
    { json: 'url', prop: 'url', kind: 'string', required: true },
    { json: 'partida', prop: 'partidaId', kind: 'int', nullable: true },
  ],
  toJson: videoJson,
};

export const cursoSpec: CrudSpec<Curso> = {
  fields: [
    { json: 'carrera', prop: 'carreraId', kind: 'int', required: true },
    { json: 'tipo_curso', prop: 'tipoCursoId', kind: 'int', required: true },
    { json: 'codigo', prop: 'codigo', kind: 'string', required: true },
    { json: 'nombre', prop: 'nombre', kind: 'string', required: true },
    { json: 'descripcion', prop: 'descripcion', kind: 'string', nullable: true },
  ],
  toJson: cursoJson,
};

export const usuarioSpec = (usuarios: UsuarioRepository, clock: Clock): CrudSpec<Usuario> => ({
  fields: [
    { json: 'email', prop: 'email', kind: 'email', required: true },
    { json: 'nombre', prop: 'nombre', kind: 'string', required: true },
    { json: 'apellido', prop: 'apellido', kind: 'string', required: true },
    { json: 'tipousuario', prop: 'tipoUsuario', kind: 'string', required: true },
  ],
  defaults: () => ({ fechaCreacion: clock.now(), estado: 'ACTIVO', isActive: true, passwordHash: null }),
  toJson: usuarioJson,
  validate: async (data, id) => {
    if (!data.email) return undefined;
    const existente = await usuarios.findByEmail(data.email);
    return existente && existente.id !== id ? { email: ['usuario with this email already exists.'] } : undefined;
  },
});

export const estudianteSpec = (
  usuarios: UsuarioRepository,
  listas: ListaParticipanteRepository,
  estudiantes: EstudianteRepository,
): CrudSpec<Estudiante> => ({
  fields: [
    { json: 'usuario_id', prop: 'usuarioId', kind: 'int', required: true },
    { json: 'lista_participante_id', prop: 'listaParticipanteId', kind: 'int', required: true },
  ],
  toJson: async (e) => {
    const [usuario, lista] = await Promise.all([usuarios.findById(e.usuarioId), listas.findById(e.listaParticipanteId)]);
    return estudianteDetailJson({ estudiante: e, usuario: usuario!, listaParticipante: lista });
  },
  validate: async (data, id) => {
    const errors: Record<string, string[]> = {};
    if (data.usuarioId !== undefined) {
      if (!(await usuarios.findById(data.usuarioId))) errors.usuario_id = ['Invalid pk - object does not exist.'];
      const existente = await estudiantes.findByUsuarioId(data.usuarioId);
      if (existente && existente.id !== id) errors.usuario_id = ['estudiante with this usuario already exists.'];
    }
    if (data.listaParticipanteId !== undefined && !(await listas.findById(data.listaParticipanteId))) {
      errors.lista_participante_id = ['Invalid pk - object does not exist.'];
    }
    return Object.keys(errors).length ? errors : undefined;
  },
});
