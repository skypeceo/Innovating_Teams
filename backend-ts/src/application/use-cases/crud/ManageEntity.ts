import { NotFoundError } from '../../../domain/errors';
import { NewEntity, Repository } from '../../ports/repositories';

/** CRUD genérico para las entidades que se exponen sin lógica de negocio adicional. */
export class ManageEntity<T extends { id: number }> {
  constructor(
    private readonly repository: Repository<T>,
    private readonly label: string,
  ) {}

  list(): Promise<T[]> {
    return this.repository.findAll();
  }

  async get(id: number): Promise<T> {
    return this.require(await this.repository.findById(id));
  }

  create(data: NewEntity<T>): Promise<T> {
    return this.repository.create(data);
  }

  async update(id: number, patch: Partial<NewEntity<T>>): Promise<T> {
    return this.require(await this.repository.update(id, patch));
  }

  async remove(id: number): Promise<void> {
    if (!(await this.repository.delete(id))) throw new NotFoundError(`${this.label} no encontrado`);
  }

  private require(entity: T | null): T {
    if (!entity) throw new NotFoundError(`${this.label} no encontrado`);
    return entity;
  }
}
