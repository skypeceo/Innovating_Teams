import { NotFoundError } from '../../../domain/errors';
import { EstadoPartidaRepository, PartidaRepository } from '../../ports/repositories';
import { Clock } from '../../ports/services';

export interface GameStateOutput {
  estadoActual: string;
  faseActual: number;
  timestamp: Date | null;
}

/** El profesor inicia el juego: estado INICIADA y fase 1 (video). */
export class StartGame {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly estados: EstadoPartidaRepository,
    private readonly clock: Clock,
  ) {}

  async execute(partidaId: number): Promise<GameStateOutput> {
    if (!(await this.partidas.findById(partidaId))) throw new NotFoundError('Partida no encontrada');
    const estado = await this.estados.activate({
      partidaId,
      estadoActual: 'INICIADA',
      faseActual: 1,
      mensaje: 'Profesor inició el juego',
      timestamp: this.clock.now(),
    });
    return { estadoActual: estado.estadoActual, faseActual: estado.faseActual, timestamp: estado.timestamp };
  }
}
