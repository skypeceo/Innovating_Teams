import { EstadoPartidaRepository } from '../../ports/repositories';
import { GameStateOutput } from './StartGame';

/** Consulta ligera pensada para polling frecuente desde los estudiantes. */
export class GetCurrentState {
  constructor(private readonly estados: EstadoPartidaRepository) {}

  async execute(partidaId: number): Promise<GameStateOutput> {
    const estado = await this.estados.findActive(partidaId);
    if (!estado) return { estadoActual: 'CONFIGURACION', faseActual: 0, timestamp: null };
    return { estadoActual: estado.estadoActual, faseActual: estado.faseActual, timestamp: estado.timestamp };
  }
}
