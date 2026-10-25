import { Equipo } from '../../../domain/entities/Equipo';
import { EquipoRepository } from '../../ports/repositories';

export class ListTeams {
  constructor(private readonly equipos: EquipoRepository) {}

  async execute(): Promise<Equipo[]> {
    return (await this.equipos.findAll()).sort((a, b) => a.id - b.id);
  }
}
