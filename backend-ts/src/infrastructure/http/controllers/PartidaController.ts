import { AssignGroups } from '../../../application/use-cases/partidas/AssignGroups';
import { AssignGroupsFromCsv } from '../../../application/use-cases/partidas/AssignGroupsFromCsv';
import { CreatePartida } from '../../../application/use-cases/partidas/CreatePartida';
import { GetCurrentState } from '../../../application/use-cases/partidas/GetCurrentState';
import { GetGroups } from '../../../application/use-cases/partidas/GetGroups';
import { JoinTeam } from '../../../application/use-cases/partidas/JoinTeam';
import { StartGame } from '../../../application/use-cases/partidas/StartGame';
import { ValidateAccessCode } from '../../../application/use-cases/partidas/ValidateAccessCode';
import { ValidateTeamCode } from '../../../application/use-cases/partidas/ValidateTeamCode';
import { ValidationError } from '../../../domain/errors';
import { Handler } from '../types';
import { fail, ok, positiveInt } from '../responses';
import { partidaJson } from '../presenters';
import { Router } from '../router';

export interface PartidaUseCases {
  createPartida: CreatePartida;
  validateAccessCode: ValidateAccessCode;
  validateTeamCode: ValidateTeamCode;
  joinTeam: JoinTeam;
  assignGroups: AssignGroups;
  assignGroupsFromCsv: AssignGroupsFromCsv;
  getGroups: GetGroups;
  startGame: StartGame;
  getCurrentState: GetCurrentState;
}

const optionalNumber = (value: unknown, fallback: number) => (value === undefined || value === null ? fallback : Number(value));

export class PartidaController {
  constructor(private readonly uc: PartidaUseCases) {}

  register(router: Router): void {
    router
      .add('POST', '/crear-partida', this.crear)
      .add('POST', '/validar-codigo', this.validarCodigo)
      .add('POST', '/validar-equipo', this.validarEquipo)
      .add('POST', '/unirse-equipo', this.unirseEquipo)
      .add('POST', '/partida/:partidaId/asignar-grupos', this.asignarGrupos)
      .add('GET', '/partida/:partidaId/obtener-grupos', this.obtenerGrupos)
      .add('POST', '/partida/:partidaId/iniciar-juego', this.iniciarJuego)
      .add('GET', '/partida/:partidaId/estado-actual', this.estadoActual)
      .add('POST', '/groups/assign', this.asignarGruposCsv);
  }

  private crear: Handler = async ({ body }) => {
    try {
      const partida = await this.uc.createPartida.execute({
        estado: typeof body.estado === 'string' ? body.estado : undefined,
        maxEquipos: optionalNumber(body.max_equipos, 4),
        maxParticipantes: optionalNumber(body.max_participantes, 20),
      });
      return ok(partidaJson(partida), 201);
    } catch (error) {
      return fail(error);
    }
  };

  private validarCodigo: Handler = async ({ body }) => {
    try {
      const r = await this.uc.validateAccessCode.execute({ codigo: body.codigo });
      return ok({ valido: true, partida_id: r.partidaId, estado: r.estado, mensaje: 'Código válido. Bienvenido al juego!' });
    } catch (error) {
      return fail(error);
    }
  };

  private validarEquipo: Handler = async ({ body }) => {
    try {
      const r = await this.uc.validateTeamCode.execute({ codigo: body.codigo });
      return ok({
        valido: true,
        partida_id: r.partidaId,
        partida_codigo: r.partidaCodigo,
        equipo_id: r.equipoId,
        equipo_nombre: r.equipoNombre,
        equipo_numero: r.equipoNumero,
        codigo_equipo: r.codigoEquipo,
        estado_partida: r.estadoPartida,
        mensaje: `¡Bienvenido al ${r.equipoNombre}!`,
      });
    } catch (error) {
      return fail(error);
    }
  };

  private unirseEquipo: Handler = async ({ body }) => {
    try {
      const r = await this.uc.joinTeam.execute({
        codigoEquipo: body.codigo_equipo,
        nombre: body.nombre,
        apellido: body.apellido,
        correo: body.correo,
      });
      return ok({
        success: true,
        usuario_id: r.usuarioId,
        equipo_id: r.equipoId,
        equipo_nombre: r.equipoNombre,
        partida_id: r.partidaId,
        mensaje: r.mensaje,
      });
    } catch (error) {
      return fail(error);
    }
  };

  private asignarGrupos: Handler = async ({ params, body }) => {
    try {
      const r = await this.uc.assignGroups.execute({ partidaId: positiveInt(params.partidaId), grupos: body.grupos });
      return ok(
        {
          mensaje: `Grupos asignados exitosamente a la partida ${r.partidaId}`,
          partida_id: r.partidaId,
          grupos_creados: r.gruposCreados.map((g) => ({
            id_equipo_creado: g.idEquipoCreado,
            nombre_grupo: g.nombreGrupo,
            codigo_equipo: g.codigoEquipo,
            alumnos_asignados: g.alumnosAsignados.map((a) => ({
              id_usuario: a.idUsuario,
              email: a.email,
              creado_nuevo: a.creadoNuevo,
            })),
          })),
        },
        201,
      );
    } catch (error) {
      return fail(error);
    }
  };

  private obtenerGrupos: Handler = async ({ params }) => {
    try {
      const r = await this.uc.getGroups.execute(positiveInt(params.partidaId));
      return ok({
        partida_id: r.partidaId,
        codigo_partida: r.codigoPartida,
        grupos: r.grupos.map((g) => ({
          equipo_id: g.equipoId,
          nombre_equipo: g.nombreEquipo,
          codigo_equipo: g.codigoEquipo,
          usuarios: g.usuarios,
        })),
      });
    } catch (error) {
      return fail(error);
    }
  };

  private iniciarJuego: Handler = async ({ params }) => {
    try {
      const r = await this.uc.startGame.execute(positiveInt(params.partidaId));
      return ok({ success: true, estado_actual: r.estadoActual, fase_actual: r.faseActual, timestamp: r.timestamp?.toISOString() });
    } catch (error) {
      return fail(error);
    }
  };

  private estadoActual: Handler = async ({ params }) => {
    try {
      const r = await this.uc.getCurrentState.execute(positiveInt(params.partidaId));
      return ok({ estado_actual: r.estadoActual, fase_actual: r.faseActual, timestamp: r.timestamp?.toISOString() ?? null });
    } catch (error) {
      return fail(error);
    }
  };

  private asignarGruposCsv: Handler = async ({ body, files }) => {
    try {
      const archivo = files.archivo_lista;
      if (!archivo) throw new ValidationError('No se envió ningún archivo CSV');
      const r = await this.uc.assignGroupsFromCsv.execute({
        csv: archivo.content.toString('utf8'),
        cantidadGrupos: Number(body.cantidad_grupos ?? 4),
        tieneEncabezado: ['true', 'True', '1'].includes(String(body.tiene_encabezado)),
        modo: String(body.modo ?? 'aleatoria'),
      });
      return ok(
        {
          mensaje: ' Grupos y estudiantes creados exitosamente',
          id_partida: r.idPartida,
          grupos: r.grupos.map((g) => ({
            nombre_equipo: g.nombreEquipo,
            codigo_equipo: g.codigoEquipo,
            estudiantes: g.estudiantes,
          })),
        },
        201,
      );
    } catch (error) {
      return fail(error);
    }
  };
}
