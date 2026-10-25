import { ValidationError, NotFoundError } from '../../../domain/errors';
import { armarCodigoEquipo } from '../../../domain/rules/partidaRules';
import { EquipoRepository, PartidaRepository, PartidaUsuarioRepository } from '../../ports/repositories';
import { StudentEnrollment } from '../../services/StudentEnrollment';
import { clean } from '../../services/text';

export interface AssignGroupsOutput {
  partidaId: number;
  gruposCreados: {
    idEquipoCreado: number;
    nombreGrupo: string;
    codigoEquipo: string;
    alumnosAsignados: { idUsuario: number; email: string; creadoNuevo: boolean }[];
  }[];
}

type Raw = Record<string, unknown>;

/** Crea un equipo nuevo por grupo recibido y asigna a sus alumnos a la partida. */
export class AssignGroups {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly equipos: EquipoRepository,
    private readonly partidaUsuarios: PartidaUsuarioRepository,
    private readonly enrollment: StudentEnrollment,
  ) {}

  async execute(input: { partidaId: number; grupos: unknown }): Promise<AssignGroupsOutput> {
    const partida = await this.partidas.findById(input.partidaId);
    if (!partida) throw new NotFoundError('No encontrado');
    if (!Array.isArray(input.grupos) || input.grupos.length === 0) {
      throw new ValidationError("Se esperaba una lista de 'grupos' en el JSON.");
    }

    const gruposCreados: AssignGroupsOutput['gruposCreados'] = [];
    for (const [idx, grupo] of (input.grupos as Raw[]).entries()) {
      const nombreGrupo = grupo?.nombre;
      const alumnos = grupo?.alumnos;
      if (!nombreGrupo || !Array.isArray(alumnos)) continue;

      const codigoEquipo = armarCodigoEquipo(partida.codigoAcceso ?? '', idx + 1);
      const equipo = await this.equipos.create({
        nombreEquipo: String(nombreGrupo),
        tamanoEquipo: alumnos.length,
        codigoEquipo,
      });

      const alumnosAsignados: AssignGroupsOutput['gruposCreados'][number]['alumnosAsignados'] = [];
      for (const alumno of alumnos as Raw[]) {
        const email = clean(alumno.id_correo_usuario);
        const nombre = clean(alumno.primer_nombre);
        if (!email || !nombre) continue;
        const apellido = `${clean(alumno.apellido_paterno)} ${clean(alumno.apellido_materno)}`.trim();

        const { usuario, usuarioCreado } = await this.enrollment.ensure({ email, nombre, apellido });
        if (!(await this.partidaUsuarios.exists({ usuarioId: usuario.id, partidaId: partida.id }))) {
          await this.partidaUsuarios.create({ usuarioId: usuario.id, partidaId: partida.id, equipoId: equipo.id });
        }
        alumnosAsignados.push({ idUsuario: usuario.id, email: usuario.email, creadoNuevo: usuarioCreado });
      }

      gruposCreados.push({ idEquipoCreado: equipo.id, nombreGrupo: equipo.nombreEquipo, codigoEquipo, alumnosAsignados });
    }

    return { partidaId: partida.id, gruposCreados };
  }
}
