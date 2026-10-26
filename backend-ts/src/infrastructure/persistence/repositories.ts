import {
  AuthTokenRepository,
  ConexionPartidaRepository,
  CursoRepository,
  DesafioRepository,
  DesafioSearch,
  EquipoRepository,
  EstadoPartidaRepository,
  EstudianteRepository,
  ListaParticipanteRepository,
  PartidaRepository,
  PartidaUsuarioRepository,
  PersonaRepository,
  SolucionLegoRepository,
  TemaDesafioRepository,
  UsuarioRepository,
  VideoRepository,
} from '../../application/ports/repositories';
import { Usuario, ListaParticipante, Estudiante } from '../../domain/entities/Usuario';
import { Equipo, SolucionLego } from '../../domain/entities/Equipo';
import { Partida, PartidaUsuario, ConexionPartida, EstadoPartida } from '../../domain/entities/Partida';
import { Desafio, Persona, TemaDesafio } from '../../domain/entities/Desafio';
import { Curso, Video } from '../../domain/entities/Contenido';
import { DocumentRepository } from './DocumentRepository';

export class DocumentUsuarioRepository extends DocumentRepository<Usuario> implements UsuarioRepository {
  findByEmail(email: string) {
    return this.findOne((u) => u.email === email);
  }
  findByNombreApellido(nombre: string, apellido: string) {
    return this.findOne((u) => u.nombre === nombre && u.apellido === apellido);
  }
}

export class DocumentListaParticipanteRepository
  extends DocumentRepository<ListaParticipante>
  implements ListaParticipanteRepository
{
  findByEmail(email: string) {
    return this.findOne((l) => l.emailEstudiante === email);
  }
}

export class DocumentEstudianteRepository extends DocumentRepository<Estudiante> implements EstudianteRepository {
  findByUsuarioId(usuarioId: number) {
    return this.findOne((e) => e.usuarioId === usuarioId);
  }
}

export class DocumentPartidaRepository extends DocumentRepository<Partida> implements PartidaRepository {
  findByCodigoAcceso(codigo: string) {
    return this.findOne((p) => p.codigoAcceso === codigo);
  }
}

export class DocumentEquipoRepository extends DocumentRepository<Equipo> implements EquipoRepository {
  findByCodigo(codigo: string) {
    return this.findOne((e) => e.codigoEquipo === codigo);
  }
  async findByCodigoPrefix(prefix: string) {
    return (await this.all())
      .filter((e) => e.codigoEquipo?.startsWith(prefix))
      .sort((a, b) => a.codigoEquipo!.localeCompare(b.codigoEquipo!));
  }
}

export class DocumentPartidaUsuarioRepository extends DocumentRepository<PartidaUsuario> implements PartidaUsuarioRepository {
  async exists({ usuarioId, partidaId, equipoId }: { usuarioId: number; partidaId: number; equipoId?: number }) {
    return (await this.all()).some(
      (i) => i.usuarioId === usuarioId && i.partidaId === partidaId && (equipoId === undefined || i.equipoId === equipoId),
    );
  }

  async findUsuarioIdsByEquipo(equipoId: number, partidaId?: number) {
    const ids = (await this.all())
      .filter((i) => i.equipoId === equipoId && (partidaId === undefined || i.partidaId === partidaId))
      .map((i) => i.usuarioId);
    return [...new Set(ids)];
  }
}

export class DocumentConexionPartidaRepository extends DocumentRepository<ConexionPartida> implements ConexionPartidaRepository {
  async connect(partidaId: number, equipoId: number, codigoIngresado: string) {
    const existente = await this.findOne((c) => c.partidaId === partidaId && c.equipoId === equipoId);
    if (existente) return (await this.update(existente.id, { activo: true, codigoIngresado }))!;
    return this.create({ partidaId, equipoId, usuarioId: null, codigoIngresado, timestampConexion: new Date(), activo: true });
  }

  async isActive(partidaId: number, equipoId: number) {
    return (await this.all()).some((c) => c.partidaId === partidaId && c.equipoId === equipoId && c.activo);
  }
}

export class DocumentEstadoPartidaRepository extends DocumentRepository<EstadoPartida> implements EstadoPartidaRepository {
  async activate(data: { partidaId: number; estadoActual: string; faseActual: number; mensaje: string | null; timestamp: Date }) {
    for (const e of await this.all()) {
      if (e.partidaId === data.partidaId && e.activo) await this.update(e.id, { activo: false });
    }
    return this.create({ ...data, activo: true });
  }

  findActive(partidaId: number) {
    return this.findOne((e) => e.partidaId === partidaId && e.activo);
  }
}

export class DocumentSolucionLegoRepository extends DocumentRepository<SolucionLego> implements SolucionLegoRepository {
  async findLatestByEquipo(equipoId: number) {
    const delEquipo = (await this.all()).filter((s) => s.equipoId === equipoId);
    delEquipo.sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime() || b.id - a.id);
    return delEquipo[0] ?? null;
  }
  async findWithImageByEquipo(equipoId: number) {
    return (await this.all()).filter((s) => s.equipoId === equipoId && !!s.fotoPrototipUrl);
  }
}

export class DocumentTemaDesafioRepository extends DocumentRepository<TemaDesafio> implements TemaDesafioRepository {}
export class DocumentPersonaRepository extends DocumentRepository<Persona> implements PersonaRepository {}
export class DocumentCursoRepository extends DocumentRepository<Curso> implements CursoRepository {}
export class DocumentVideoRepository extends DocumentRepository<Video> implements VideoRepository {}

export class DocumentDesafioRepository extends DocumentRepository<Desafio> implements DesafioRepository {
  async searchActive({ search, temaId, offset, limit }: DesafioSearch) {
    const term = search?.toLowerCase();
    const matches = (await this.all())
      .filter((d) => d.estado === 'ACTIVO')
      .filter((d) => temaId === undefined || d.temaDesafioId === temaId)
      .filter((d) => !term || d.titulo.toLowerCase().includes(term) || d.descripcion.toLowerCase().includes(term))
      .sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());
    return { items: matches.slice(offset, offset + limit), total: matches.length };
  }

  async countActiveByTema(temaId: number) {
    return (await this.all()).filter((d) => d.temaDesafioId === temaId && d.estado === 'ACTIVO').length;
  }
}

/** Un documento por usuario: el id es el id del usuario. */
interface AuthToken {
  id: number;
  key: string;
}

export class DocumentAuthTokenRepository extends DocumentRepository<AuthToken> implements AuthTokenRepository {
  async getOrCreate(usuarioId: number, key: string) {
    const existente = await this.findById(usuarioId);
    if (existente) return existente.key;
    await this.store.put(this.entity, { id: usuarioId, key });
    return key;
  }

  async findUsuarioId(key: string) {
    return (await this.findOne((t) => t.key === key))?.id ?? null;
  }
}
