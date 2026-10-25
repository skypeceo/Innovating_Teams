import { ForbiddenError, NotFoundError, ValidationError } from '../../../domain/errors';
import { codigoPartidaDe, CODIGO_EQUIPO_LENGTH, partidaAdmiteUnirse } from '../../../domain/rules/partidaRules';
import {
  EquipoRepository,
  PartidaRepository,
  PartidaUsuarioRepository,
  UsuarioRepository,
} from '../../ports/repositories';
import { Clock } from '../../ports/services';
import { clean } from '../../services/text';

export interface JoinTeamInput {
  codigoEquipo: unknown;
  nombre: unknown;
  apellido: unknown;
  correo?: unknown;
}

export interface JoinTeamOutput {
  usuarioId: number;
  equipoId: number;
  equipoNombre: string;
  partidaId: number;
  mensaje: string;
}

export class JoinTeam {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly equipos: EquipoRepository,
    private readonly partidas: PartidaRepository,
    private readonly partidaUsuarios: PartidaUsuarioRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: JoinTeamInput): Promise<JoinTeamOutput> {
    const codigoEquipo = clean(input.codigoEquipo);
    const nombre = clean(input.nombre);
    const apellido = clean(input.apellido);
    const correo = clean(input.correo);

    if (codigoEquipo.length !== CODIGO_EQUIPO_LENGTH) throw new ValidationError('Código de equipo inválido');
    if (!nombre || !apellido) throw new ValidationError('Nombre y apellido son requeridos');

    const equipo = await this.equipos.findByCodigo(codigoEquipo);
    if (!equipo) throw new NotFoundError('El código de equipo no existe');

    const partida = await this.partidas.findByCodigoAcceso(codigoPartidaDe(codigoEquipo));
    if (!partida) throw new NotFoundError('La partida no existe');
    if (!partidaAdmiteUnirse(partida.estado)) throw new ForbiddenError('La partida no está disponible');

    const usuario = await this.resolverUsuario(nombre, apellido, correo);

    const yaRegistrado = await this.partidaUsuarios.exists({
      usuarioId: usuario.id,
      partidaId: partida.id,
      equipoId: equipo.id,
    });
    if (!yaRegistrado) {
      await this.partidaUsuarios.create({ usuarioId: usuario.id, partidaId: partida.id, equipoId: equipo.id });
    }

    return {
      usuarioId: usuario.id,
      equipoId: equipo.id,
      equipoNombre: equipo.nombreEquipo,
      partidaId: partida.id,
      mensaje: yaRegistrado
        ? `¡Bienvenido de nuevo ${nombre}! Ya estabas registrado en el ${equipo.nombreEquipo}`
        : `¡Bienvenido ${nombre}! Te has unido correctamente al ${equipo.nombreEquipo}`,
    };
  }

  /** Con correo se busca/actualiza por correo; sin él se usa un correo temporal derivado del nombre. */
  private async resolverUsuario(nombre: string, apellido: string, correo: string) {
    const existente = correo
      ? await this.usuarios.findByEmail(correo)
      : await this.usuarios.findByNombreApellido(nombre, apellido);

    if (existente) {
      if (correo && (existente.nombre !== nombre || existente.apellido !== apellido)) {
        return (await this.usuarios.update(existente.id, { nombre, apellido }))!;
      }
      return existente;
    }

    return this.usuarios.create({
      email: correo || `${nombre.toLowerCase()}.${apellido.toLowerCase()}@temp.com`,
      nombre,
      apellido,
      tipoUsuario: 'ESTUDIANTE',
      fechaCreacion: this.clock.now(),
      estado: 'ACTIVO',
      isActive: true,
      passwordHash: null,
    });
  }
}
