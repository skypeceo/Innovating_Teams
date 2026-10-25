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
  NewEntity,
  PartidaRepository,
  PartidaUsuarioRepository,
  PersonaRepository,
  SolucionLegoRepository,
  TemaDesafioRepository,
  UsuarioRepository,
  VideoRepository,
} from '../../../application/ports/repositories';
import { Usuario, ListaParticipante, Estudiante } from '../../../domain/entities/Usuario';
import { Equipo, SolucionLego } from '../../../domain/entities/Equipo';
import { Partida, PartidaUsuario, ConexionPartida, EstadoPartida } from '../../../domain/entities/Partida';
import { Desafio, Persona, TemaDesafio } from '../../../domain/entities/Desafio';
import { Curso, Video } from '../../../domain/entities/Contenido';
import { InMemoryRepository } from './InMemoryRepository';

export class InMemoryUsuarioRepository extends InMemoryRepository<Usuario> implements UsuarioRepository {
  async findByEmail(email: string) {
    return this.findOne((u) => u.email === email);
  }
  async findByNombreApellido(nombre: string, apellido: string) {
    return this.findOne((u) => u.nombre === nombre && u.apellido === apellido);
  }
}

export class InMemoryListaParticipanteRepository
  extends InMemoryRepository<ListaParticipante>
  implements ListaParticipanteRepository
{
  async findByEmail(email: string) {
    return this.findOne((l) => l.emailEstudiante === email);
  }
}

export class InMemoryEstudianteRepository extends InMemoryRepository<Estudiante> implements EstudianteRepository {
  async findByUsuarioId(usuarioId: number) {
    return this.findOne((e) => e.usuarioId === usuarioId);
  }
}

export class InMemoryPartidaRepository extends InMemoryRepository<Partida> implements PartidaRepository {
  async findByCodigoAcceso(codigo: string) {
    return this.findOne((p) => p.codigoAcceso === codigo);
  }
}

export class InMemoryEquipoRepository extends InMemoryRepository<Equipo> implements EquipoRepository {
  async findByCodigo(codigo: string) {
    return this.findOne((e) => e.codigoEquipo === codigo);
  }
  async findByCodigoPrefix(prefix: string) {
    return this.all()
      .filter((e) => e.codigoEquipo?.startsWith(prefix))
      .sort((a, b) => a.codigoEquipo!.localeCompare(b.codigoEquipo!));
  }
}

export class InMemoryPartidaUsuarioRepository implements PartidaUsuarioRepository {
  private readonly items: PartidaUsuario[] = [];
  private nextId = 1;

  async create(data: NewEntity<PartidaUsuario>) {
    const item = { ...data, id: this.nextId++ };
    this.items.push(item);
    return { ...item };
  }

  async exists({ usuarioId, partidaId, equipoId }: { usuarioId: number; partidaId: number; equipoId?: number }) {
    return this.items.some(
      (i) => i.usuarioId === usuarioId && i.partidaId === partidaId && (equipoId === undefined || i.equipoId === equipoId),
    );
  }

  async findUsuarioIdsByEquipo(equipoId: number, partidaId?: number) {
    const ids = this.items
      .filter((i) => i.equipoId === equipoId && (partidaId === undefined || i.partidaId === partidaId))
      .map((i) => i.usuarioId);
    return [...new Set(ids)];
  }
}

export class InMemoryConexionPartidaRepository implements ConexionPartidaRepository {
  private readonly items: ConexionPartida[] = [];
  private nextId = 1;

  async connect(partidaId: number, equipoId: number, codigoIngresado: string) {
    const existente = this.items.find((c) => c.partidaId === partidaId && c.equipoId === equipoId);
    if (existente) {
      existente.activo = true;
      existente.codigoIngresado = codigoIngresado;
      return { ...existente };
    }
    const nueva: ConexionPartida = {
      id: this.nextId++,
      partidaId,
      equipoId,
      usuarioId: null,
      codigoIngresado,
      timestampConexion: new Date(),
      activo: true,
    };
    this.items.push(nueva);
    return { ...nueva };
  }

  async isActive(partidaId: number, equipoId: number) {
    return this.items.some((c) => c.partidaId === partidaId && c.equipoId === equipoId && c.activo);
  }
}

export class InMemoryEstadoPartidaRepository implements EstadoPartidaRepository {
  private readonly items: EstadoPartida[] = [];
  private nextId = 1;

  async activate(data: { partidaId: number; estadoActual: string; faseActual: number; mensaje: string | null; timestamp: Date }) {
    this.items.filter((e) => e.partidaId === data.partidaId).forEach((e) => (e.activo = false));
    const estado: EstadoPartida = { ...data, id: this.nextId++, activo: true };
    this.items.push(estado);
    return { ...estado };
  }

  async findActive(partidaId: number) {
    const activo = this.items.find((e) => e.partidaId === partidaId && e.activo);
    return activo ? { ...activo } : null;
  }
}

export class InMemorySolucionLegoRepository extends InMemoryRepository<SolucionLego> implements SolucionLegoRepository {
  async findLatestByEquipo(equipoId: number) {
    const delEquipo = this.all().filter((s) => s.equipoId === equipoId);
    delEquipo.sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime() || b.id - a.id);
    return delEquipo[0] ?? null;
  }
  async findWithImageByEquipo(equipoId: number) {
    return this.all().filter((s) => s.equipoId === equipoId && !!s.fotoPrototipUrl);
  }
}

export class InMemoryTemaDesafioRepository extends InMemoryRepository<TemaDesafio> implements TemaDesafioRepository {}
export class InMemoryPersonaRepository extends InMemoryRepository<Persona> implements PersonaRepository {}
export class InMemoryCursoRepository extends InMemoryRepository<Curso> implements CursoRepository {}
export class InMemoryVideoRepository extends InMemoryRepository<Video> implements VideoRepository {}

export class InMemoryDesafioRepository extends InMemoryRepository<Desafio> implements DesafioRepository {
  async searchActive({ search, temaId, offset, limit }: DesafioSearch) {
    const term = search?.toLowerCase();
    const matches = this.all()
      .filter((d) => d.estado === 'ACTIVO')
      .filter((d) => temaId === undefined || d.temaDesafioId === temaId)
      .filter((d) => !term || d.titulo.toLowerCase().includes(term) || d.descripcion.toLowerCase().includes(term))
      .sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());
    return { items: matches.slice(offset, offset + limit), total: matches.length };
  }

  async countActiveByTema(temaId: number) {
    return this.all().filter((d) => d.temaDesafioId === temaId && d.estado === 'ACTIVO').length;
  }
}

export class InMemoryAuthTokenRepository implements AuthTokenRepository {
  private readonly byUser = new Map<number, string>();

  async getOrCreate(usuarioId: number, key: string) {
    const existente = this.byUser.get(usuarioId);
    if (existente) return existente;
    this.byUser.set(usuarioId, key);
    return key;
  }
}
