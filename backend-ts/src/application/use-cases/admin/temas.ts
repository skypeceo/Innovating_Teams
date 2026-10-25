import { TemaDesafio } from '../../../domain/entities/Desafio';
import { NotFoundError, ValidationError } from '../../../domain/errors';
import { DesafioRepository, TemaDesafioRepository } from '../../ports/repositories';
import { clean } from '../../services/text';

export interface TemaWithCount {
  tema: TemaDesafio;
  totalDesafios: number;
}

const normalizar = (s: string) => s.toLowerCase();

abstract class TemaUseCase {
  constructor(
    protected readonly temas: TemaDesafioRepository,
    protected readonly desafios: DesafioRepository,
  ) {}

  protected async withCount(tema: TemaDesafio): Promise<TemaWithCount> {
    return { tema, totalDesafios: await this.desafios.countActiveByTema(tema.id) };
  }

  protected readInput(input: { nombretema?: unknown; descripcion?: unknown }) {
    const nombreTema = clean(input.nombretema);
    const descripcion = clean(input.descripcion);
    if (!nombreTema || !descripcion) throw new ValidationError('Nombre del tema y descripción son requeridos');
    return { nombreTema, descripcion };
  }

  protected async nombreEnUso(nombre: string, exceptoId?: number): Promise<boolean> {
    return (await this.temas.findAll()).some(
      (t) => t.estado === 'ACTIVO' && t.id !== exceptoId && normalizar(t.nombreTema) === normalizar(nombre),
    );
  }
}

export class ListTemas extends TemaUseCase {
  async execute(): Promise<TemaWithCount[]> {
    const activos = (await this.temas.findAll())
      .filter((t) => t.estado === 'ACTIVO')
      .sort((a, b) => a.nombreTema.localeCompare(b.nombreTema));
    return Promise.all(activos.map((t) => this.withCount(t)));
  }
}

export class GetTema extends TemaUseCase {
  async execute(id: number): Promise<TemaWithCount> {
    const tema = await this.temas.findById(id);
    if (!tema) throw new NotFoundError('Tema no encontrado');
    return this.withCount(tema);
  }
}

export class CreateTema extends TemaUseCase {
  async execute(input: { nombretema?: unknown; descripcion?: unknown }): Promise<TemaWithCount> {
    const { nombreTema, descripcion } = this.readInput(input);
    if (await this.nombreEnUso(nombreTema)) throw new ValidationError('Ya existe un tema con ese nombre');
    const tema = await this.temas.create({ nombreTema, descripcion, estado: 'ACTIVO' });
    return { tema, totalDesafios: 0 };
  }
}

export class UpdateTema extends TemaUseCase {
  async execute(id: number, input: { nombretema?: unknown; descripcion?: unknown }): Promise<TemaDesafio> {
    const { nombreTema, descripcion } = this.readInput(input);
    if (await this.nombreEnUso(nombreTema, id)) throw new ValidationError('Ya existe otro tema con ese nombre');
    const actual = await this.temas.findById(id);
    if (!actual || actual.estado !== 'ACTIVO') throw new NotFoundError('Tema no encontrado o no se puede actualizar');
    return (await this.temas.update(id, { nombreTema, descripcion }))!;
  }
}

/** Baja lógica: se rechaza si el tema aún tiene desafíos activos. */
export class DeleteTema extends TemaUseCase {
  async execute(id: number): Promise<void> {
    const activos = await this.desafios.countActiveByTema(id);
    if (activos > 0) {
      throw new ValidationError(`No se puede eliminar. Hay ${activos} desafío(s) activo(s) asociado(s) a este tema`);
    }
    const tema = await this.temas.findById(id);
    if (!tema || tema.estado !== 'ACTIVO') throw new NotFoundError('Tema no encontrado');
    await this.temas.update(id, { estado: 'INACTIVO' });
  }
}
