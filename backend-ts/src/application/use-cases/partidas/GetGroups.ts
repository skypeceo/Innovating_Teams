import { NotFoundError } from '../../../domain/errors';
import {
  ConexionPartidaRepository,
  EquipoRepository,
  PartidaRepository,
  PartidaUsuarioRepository,
  UsuarioRepository,
} from '../../ports/repositories';

export interface GetGroupsOutput {
  partidaId: number;
  codigoPartida: string | null;
  grupos: {
    equipoId: number;
    nombreEquipo: string;
    codigoEquipo: string | null;
    usuarios: { correo: string; nombre: string; apellido: string }[];
  }[];
}

/** Lista los equipos de la partida; solo expone sus alumnos cuando el equipo ya se conectó. */
export class GetGroups {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly equipos: EquipoRepository,
    private readonly conexiones: ConexionPartidaRepository,
    private readonly partidaUsuarios: PartidaUsuarioRepository,
    private readonly usuarios: UsuarioRepository,
  ) {}

  async execute(partidaId: number): Promise<GetGroupsOutput> {
    const partida = await this.partidas.findById(partidaId);
    if (!partida) throw new NotFoundError('La partida especificada no existe');

    const equipos = await this.equipos.findByCodigoPrefix(String(partida.codigoAcceso));
    const grupos: GetGroupsOutput['grupos'] = [];
    for (const equipo of equipos) {
      const conectado = await this.conexiones.isActive(partida.id, equipo.id);
      const usuarios = [];
      if (conectado) {
        for (const id of await this.partidaUsuarios.findUsuarioIdsByEquipo(equipo.id, partida.id)) {
          const u = await this.usuarios.findById(id);
          if (u) usuarios.push({ correo: u.email, nombre: u.nombre, apellido: u.apellido });
        }
      }
      grupos.push({ equipoId: equipo.id, nombreEquipo: equipo.nombreEquipo, codigoEquipo: equipo.codigoEquipo, usuarios });
    }

    return { partidaId, codigoPartida: partida.codigoAcceso, grupos };
  }
}
