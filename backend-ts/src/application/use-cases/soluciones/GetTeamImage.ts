import { ValidationError } from '../../../domain/errors';
import { SolucionLegoRepository } from '../../ports/repositories';

export type GetTeamImageOutput =
  | { found: false }
  | { found: true; imageUrl: string; solucionId: number; teamId: number };

const URL_DUMMY = 'http://example.com/';

export class GetTeamImage {
  constructor(private readonly soluciones: SolucionLegoRepository) {}

  async execute(input: { teamId: unknown }): Promise<GetTeamImageOutput> {
    if (!input.teamId) throw new ValidationError('team_id es requerido');
    const teamId = Number(input.teamId);
    if (!Number.isInteger(teamId)) throw new ValidationError('team_id debe ser un número válido');

    // Prioriza imágenes reales sobre URLs dummy de pruebas; la más reciente primero.
    const candidatas = (await this.soluciones.findWithImageByEquipo(teamId)).sort((a, b) => b.id - a.id);
    const elegida = candidatas.find((s) => !s.fotoPrototipUrl!.startsWith(URL_DUMMY)) ?? candidatas[0];
    if (!elegida) return { found: false };
    return { found: true, imageUrl: elegida.fotoPrototipUrl!, solucionId: elegida.id, teamId };
  }
}
