// Traduce entidades de dominio al JSON que ya consume el frontend (nombres de campo del API Django).
import { Usuario, ListaParticipante } from '../../domain/entities/Usuario';
import { Equipo } from '../../domain/entities/Equipo';
import { Partida } from '../../domain/entities/Partida';
import { Desafio, Persona, TemaDesafio } from '../../domain/entities/Desafio';
import { Curso, Video } from '../../domain/entities/Contenido';
import { StudentDetail } from '../../application/use-cases/estudiantes/GetStudentsByTeam';
import { DesafioView } from '../../application/use-cases/admin/desafios';
import { TemaWithCount } from '../../application/use-cases/admin/temas';

const iso = (date: Date | null) => (date ? date.toISOString() : null);

export const usuarioJson = (u: Usuario) => ({
  id: u.id,
  email: u.email,
  nombre: u.nombre,
  apellido: u.apellido,
  tipousuario: u.tipoUsuario,
});

export const listaParticipanteJson = (l: ListaParticipante) => ({
  id: l.id,
  emailestudiante: l.emailEstudiante,
  nombreestudiante: l.nombreEstudiante,
});

export const estudianteDetailJson = ({ estudiante, usuario, listaParticipante }: StudentDetail) => ({
  id: estudiante.id,
  usuario: usuarioJson(usuario),
  lista_participante: listaParticipante ? listaParticipanteJson(listaParticipante) : null,
});

export const equipoJson = (e: Equipo) => ({ id: e.id, tamanoequipo: e.tamanoEquipo, nombre: e.nombreEquipo });

export const partidaJson = (p: Partida) => ({
  id: p.id,
  estado: p.estado,
  codigoAcceso: p.codigoAcceso,
  maxEquipos: p.maxEquipos,
  maxParticipantes: p.maxParticipantes,
  fechaCreacion: iso(p.fechaCreacion),
});

export const cursoJson = (c: Curso) => ({
  id: c.id,
  carrera: c.carreraId,
  tipo_curso: c.tipoCursoId,
  codigo: c.codigo,
  nombre: c.nombre,
  descripcion: c.descripcion,
});

export const videoJson = (v: Video) => ({ id: v.id, nombrevideo: v.nombreVideo, url: v.url, partida: v.partidaId });

export const temaJson = (t: TemaDesafio) => ({
  id: t.id,
  nombretema: t.nombreTema,
  descripcion: t.descripcion,
  estado: t.estado,
});

export const temaWithCountJson = ({ tema, totalDesafios }: TemaWithCount) => ({
  ...temaJson(tema),
  total_desafios: totalDesafios,
});

export const desafioBaseJson = (d: Desafio) => ({
  id: d.id,
  titulo: d.titulo,
  descripcion: d.descripcion,
  nombrepersona: d.nombrePersona,
  edadpersona: d.edadPersona,
  contexto: d.contexto,
  fechacreacion: iso(d.fechaCreacion),
  tema_desafio_id: d.temaDesafioId,
  persona_id: d.personaId,
});

export const desafioViewJson = ({ desafio, temaNombre, personaNombre }: DesafioView) => ({
  ...desafioBaseJson(desafio),
  estado: desafio.estado,
  tema_nombre: temaNombre,
  persona_nombre: personaNombre,
});

export const personaJson = (p: Persona) => ({
  id: p.id,
  nombre: p.nombrePersona,
  imagenurl: p.imagenUrl || '',
  contexto: p.contextoPersona || '',
  edad: p.edad,
});
