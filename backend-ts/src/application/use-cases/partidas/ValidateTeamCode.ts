import { ForbiddenError, NotFoundError, ValidationError } from '../../../domain/errors';
import { codigoPartidaDe, esCodigoEquipo, numeroEquipoDe, partidaAdmiteUnirse } from '../../../domain/rules/partidaRules';
import { ConexionPartidaRepository, EquipoRepository, PartidaRepository } from '../../ports/repositories';
import { clean } from '../../services/text';

export interface ValidateTeamCodeOutput {
  partidaId: number;
  partidaCodigo: string;
  equipoId: number;
  equipoNombre: string;
  equipoNumero: number;
  codigoEquipo: string;
  estadoPartida: string;
}

/** Valida el código de 7 dígitos y marca el equipo como conectado a la partida. */
export class ValidateTeamCode {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly equipos: EquipoRepository,
    private readonly conexiones: ConexionPartidaRepository,
  ) {}

  async execute(input: { codigo: unknown }): Promise<ValidateTeamCodeOutput> {
    const codigo = clean(input.codigo);
    if (!codigo) throw new ValidationError('Código requerido');
    if (!esCodigoEquipo(codigo)) {
      throw new ValidationError('Código inválido. Debe ser un número de 7 dígitos (ej: 1234561)');
    }

    const equipo = await this.equipos.findByCodigo(codigo);
    if (!equipo) {
      throw new NotFoundError('Código inválido. Verifica con tu profesor el código correcto de tu equipo');
    }

    const codigoPartida = codigoPartidaDe(codigo);
    const partida = await this.partidas.findByCodigoAcceso(codigoPartida);
    if (!partida) throw new NotFoundError('El código de partida no existe. Verifica con tu profesor');
    if (!partidaAdmiteUnirse(partida.estado)) {
      throw new ForbiddenError('La partida ya finalizó o no está disponible para jugar');
    }

    await this.conexiones.connect(partida.id, equipo.id, codigo);

    return {
      partidaId: partida.id,
      partidaCodigo: codigoPartida,
      equipoId: equipo.id,
      equipoNombre: equipo.nombreEquipo,
      equipoNumero: numeroEquipoDe(codigo),
      codigoEquipo: codigo,
      estadoPartida: partida.estado,
    };
  }
}
