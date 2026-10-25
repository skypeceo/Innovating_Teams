import { ForbiddenError, NotFoundError, ValidationError } from '../../../domain/errors';
import { esCodigoPartida, partidaAdmiteUnirse } from '../../../domain/rules/partidaRules';
import { PartidaRepository } from '../../ports/repositories';
import { clean } from '../../services/text';

export interface ValidateAccessCodeOutput {
  partidaId: number;
  estado: string;
}

export class ValidateAccessCode {
  constructor(private readonly partidas: PartidaRepository) {}

  async execute(input: { codigo: unknown }): Promise<ValidateAccessCodeOutput> {
    const codigo = clean(input.codigo);
    if (!codigo) throw new ValidationError('Código de acceso requerido');
    if (!esCodigoPartida(codigo)) throw new ValidationError('Código inválido. Debe ser un número de 6 dígitos');

    const partida = await this.partidas.findByCodigoAcceso(codigo);
    if (!partida) throw new NotFoundError('Código de acceso inválido. Verifica con tu profesor');
    if (!partidaAdmiteUnirse(partida.estado)) throw new ForbiddenError('La partida ya finalizó o no está disponible');

    return { partidaId: partida.id, estado: partida.estado };
  }
}
