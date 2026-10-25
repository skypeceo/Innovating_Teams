import { Usuario, ListaParticipante, Estudiante } from '../../domain/entities/Usuario';
import { Equipo, SolucionLego } from '../../domain/entities/Equipo';
import { Partida, PartidaUsuario, ConexionPartida, EstadoPartida } from '../../domain/entities/Partida';
import { TemaDesafio, Persona, Desafio } from '../../domain/entities/Desafio';
import { Curso, Video } from '../../domain/entities/Contenido';

export type NewEntity<T extends { id: number }> = Omit<T, 'id'>;

export interface Repository<T extends { id: number }> {
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: NewEntity<T>): Promise<T>;
  update(id: number, patch: Partial<NewEntity<T>>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
}

export interface UsuarioRepository extends Repository<Usuario> {
  findByEmail(email: string): Promise<Usuario | null>;
  findByNombreApellido(nombre: string, apellido: string): Promise<Usuario | null>;
}

export interface ListaParticipanteRepository extends Repository<ListaParticipante> {
  findByEmail(email: string): Promise<ListaParticipante | null>;
}

export interface EstudianteRepository extends Repository<Estudiante> {
  findByUsuarioId(usuarioId: number): Promise<Estudiante | null>;
}

export interface PartidaRepository extends Repository<Partida> {
  findByCodigoAcceso(codigo: string): Promise<Partida | null>;
}

export interface EquipoRepository extends Repository<Equipo> {
  findByCodigo(codigo: string): Promise<Equipo | null>;
  findByCodigoPrefix(prefix: string): Promise<Equipo[]>;
}

export interface PartidaUsuarioRepository {
  create(data: NewEntity<PartidaUsuario>): Promise<PartidaUsuario>;
  exists(filter: { usuarioId: number; partidaId: number; equipoId?: number }): Promise<boolean>;
  findUsuarioIdsByEquipo(equipoId: number, partidaId?: number): Promise<number[]>;
}

export interface ConexionPartidaRepository {
  /** Crea la conexión equipo-partida o la reactiva si ya existía. */
  connect(partidaId: number, equipoId: number, codigoIngresado: string): Promise<ConexionPartida>;
  isActive(partidaId: number, equipoId: number): Promise<boolean>;
}

export interface EstadoPartidaRepository {
  /** Desactiva los estados previos de la partida y registra el nuevo como activo. */
  activate(data: { partidaId: number; estadoActual: string; faseActual: number; mensaje: string | null; timestamp: Date }): Promise<EstadoPartida>;
  findActive(partidaId: number): Promise<EstadoPartida | null>;
}

export interface SolucionLegoRepository extends Repository<SolucionLego> {
  findLatestByEquipo(equipoId: number): Promise<SolucionLego | null>;
  findWithImageByEquipo(equipoId: number): Promise<SolucionLego[]>;
}

export interface TemaDesafioRepository extends Repository<TemaDesafio> {}

export interface PersonaRepository extends Repository<Persona> {}

export interface DesafioSearch {
  search?: string;
  temaId?: number;
  offset: number;
  limit: number;
}

export interface DesafioRepository extends Repository<Desafio> {
  searchActive(filter: DesafioSearch): Promise<{ items: Desafio[]; total: number }>;
  countActiveByTema(temaId: number): Promise<number>;
}

export interface CursoRepository extends Repository<Curso> {}
export interface VideoRepository extends Repository<Video> {}

export interface AuthTokenRepository {
  /** Devuelve el token del usuario, creándolo con `key` si no tenía. */
  getOrCreate(usuarioId: number, key: string): Promise<string>;
}
