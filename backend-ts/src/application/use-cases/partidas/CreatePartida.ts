import { Partida } from '../../../domain/entities/Partida';
import { PartidaRepository } from '../../ports/repositories';
import { Clock, Randomizer } from '../../ports/services';

export interface CreatePartidaInput {
  estado?: string;
  maxEquipos?: number;
  maxParticipantes?: number;
}

const MAX_INTENTOS = 10;

export class CreatePartida {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly clock: Clock,
    private readonly random: Randomizer,
  ) {}

  async execute({ estado = 'CONFIGURACION', maxEquipos = 4, maxParticipantes = 20 }: CreatePartidaInput): Promise<Partida> {
    return this.partidas.create({
      estado,
      codigoAcceso: await this.generarCodigoUnico(),
      maxEquipos,
      maxParticipantes,
      fechaCreacion: this.clock.now(),
      fechaInicio: null,
      fechaFin: null,
    });
  }

  /** PIN numérico de 6 dígitos; si tras varios intentos hay colisión, cae a un fragmento de UUID. */
  private async generarCodigoUnico(): Promise<string> {
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const pin = String(this.random.int(100000, 999999));
      if (!(await this.partidas.findByCodigoAcceso(pin))) return pin;
    }
    return this.random.uuid().slice(0, 8);
  }
}
