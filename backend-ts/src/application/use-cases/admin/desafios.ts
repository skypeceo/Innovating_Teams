import { Desafio } from '../../../domain/entities/Desafio';
import { NotFoundError, ValidationError } from '../../../domain/errors';
import { DesafioRepository, PersonaRepository, TemaDesafioRepository } from '../../ports/repositories';
import { Clock } from '../../ports/services';
import { clean } from '../../services/text';

export interface DesafioView {
  desafio: Desafio;
  temaNombre: string | null;
  personaNombre: string | null;
}

export interface DesafioInput {
  titulo?: unknown;
  descripcion?: unknown;
  tema_desafio_id?: unknown;
  persona_id?: unknown;
  nombrepersona?: unknown;
  edadpersona?: unknown;
  contexto?: unknown;
}

abstract class DesafioUseCase {
  constructor(
    protected readonly desafios: DesafioRepository,
    protected readonly temas: TemaDesafioRepository,
    protected readonly personas: PersonaRepository,
  ) {}

  protected async view(desafio: Desafio): Promise<DesafioView> {
    const [tema, persona] = await Promise.all([
      this.temas.findById(desafio.temaDesafioId),
      this.personas.findById(desafio.personaId),
    ]);
    return { desafio, temaNombre: tema?.nombreTema ?? null, personaNombre: persona?.nombrePersona ?? null };
  }

  /** Valida los campos y que tema/persona existan; devuelve los datos listos para persistir. */
  protected async readInput(input: DesafioInput) {
    const titulo = clean(input.titulo);
    const descripcion = clean(input.descripcion);
    const temaDesafioId = Number(input.tema_desafio_id);
    const personaId = Number(input.persona_id);
    if (!titulo || !descripcion || !input.tema_desafio_id || !input.persona_id) {
      throw new ValidationError('Título, descripción, tema y persona son requeridos');
    }
    const tema = await this.temas.findById(temaDesafioId);
    if (!tema || tema.estado !== 'ACTIVO') throw new ValidationError('Tema de desafío no válido o inactivo');
    if (!(await this.personas.findById(personaId))) throw new ValidationError('Persona/arquetipo no válido');

    const edad = input.edadpersona;
    return {
      titulo,
      descripcion,
      temaDesafioId,
      personaId,
      nombrePersona: clean(input.nombrepersona),
      edadPersona: edad === undefined || edad === null || edad === '' ? null : Number(edad),
      contexto: clean(input.contexto),
    };
  }
}

export interface ListDesafiosInput {
  page?: string;
  limit?: string;
  search?: string;
  temaId?: string;
}

export class ListDesafios extends DesafioUseCase {
  async execute(input: ListDesafiosInput) {
    const page = Number(input.page ?? 1);
    const limit = Number(input.limit ?? 10);
    const temaId = input.temaId ? Number(input.temaId) : undefined;
    if (![page, limit].every(Number.isInteger) || page < 1 || limit < 1 || (input.temaId && !Number.isInteger(temaId))) {
      throw new ValidationError('Parámetros de paginación inválidos');
    }

    const { items, total } = await this.desafios.searchActive({
      search: input.search?.trim() || undefined,
      temaId,
      offset: (page - 1) * limit,
      limit,
    });
    return {
      desafios: await Promise.all(items.map((d) => this.view(d))),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

export class GetDesafio extends DesafioUseCase {
  async execute(id: number): Promise<DesafioView> {
    const desafio = await this.desafios.findById(id);
    if (!desafio) throw new NotFoundError('Desafío no encontrado');
    return this.view(desafio);
  }
}

export class CreateDesafio extends DesafioUseCase {
  constructor(desafios: DesafioRepository, temas: TemaDesafioRepository, personas: PersonaRepository, private readonly clock: Clock) {
    super(desafios, temas, personas);
  }

  async execute(input: DesafioInput): Promise<Desafio> {
    return this.desafios.create({ ...(await this.readInput(input)), estado: 'ACTIVO', fechaCreacion: this.clock.now() });
  }
}

export class UpdateDesafio extends DesafioUseCase {
  async execute(id: number, input: DesafioInput): Promise<Desafio> {
    const data = await this.readInput(input);
    const actual = await this.desafios.findById(id);
    if (!actual || actual.estado !== 'ACTIVO') throw new NotFoundError('Desafío no encontrado o no se puede actualizar');
    return (await this.desafios.update(id, data))!;
  }
}

export class DeleteDesafio extends DesafioUseCase {
  async execute(id: number): Promise<void> {
    const actual = await this.desafios.findById(id);
    if (!actual || actual.estado !== 'ACTIVO') throw new NotFoundError('Desafío no encontrado');
    await this.desafios.update(id, { estado: 'INACTIVO' });
  }
}
