import { NotFoundError, ValidationError } from '../../../domain/errors';
import { EquipoRepository, SolucionLegoRepository } from '../../ports/repositories';
import { Clock } from '../../ports/services';

export interface SaveSolutionImageOutput {
  solucionId: number;
  imageUrl: string;
  created: boolean;
}

export class SaveSolutionImage {
  constructor(
    private readonly equipos: EquipoRepository,
    private readonly soluciones: SolucionLegoRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { equipoId: unknown; imageUrl: unknown; descripcion?: unknown }): Promise<SaveSolutionImageOutput> {
    const { equipoId, imageUrl } = input;
    if (!equipoId || typeof imageUrl !== 'string' || !imageUrl) {
      throw new ValidationError('equipo_id y image_url son requeridos');
    }
    const equipo = await this.equipos.findById(Number(equipoId));
    if (!equipo) throw new NotFoundError('Equipo no encontrado');

    const descripcion = typeof input.descripcion === 'string' ? input.descripcion : '';
    const existente = await this.soluciones.findLatestByEquipo(equipo.id);
    if (existente) {
      const actualizada = (await this.soluciones.update(existente.id, {
        fotoPrototipUrl: imageUrl,
        descripSoluc: descripcion,
      }))!;
      return { solucionId: actualizada.id, imageUrl, created: false };
    }
    const creada = await this.soluciones.create({
      equipoId: equipo.id,
      fechaCreacion: this.clock.now(),
      descripSoluc: descripcion,
      fotoPrototipUrl: imageUrl,
    });
    return { solucionId: creada.id, imageUrl, created: true };
  }
}
