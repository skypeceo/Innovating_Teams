import { NewEntity, Repository } from '../../application/ports/repositories';
import { DocumentStore } from './DocumentStore';

/** Repositorio genérico: cada entidad es una colección de documentos en el DocumentStore (memoria o DynamoDB). */
export class DocumentRepository<T extends { id: number }> implements Repository<T> {
  constructor(
    protected readonly store: DocumentStore,
    protected readonly entity: string,
  ) {}

  protected all(): Promise<T[]> {
    return this.store.list<T>(this.entity);
  }

  findById(id: number): Promise<T | null> {
    return this.store.get<T>(this.entity, id);
  }

  findAll(): Promise<T[]> {
    return this.all();
  }

  async create(data: NewEntity<T>): Promise<T> {
    const item = { ...data, id: await this.store.nextId(this.entity) } as T;
    await this.store.put(this.entity, item);
    return item;
  }

  async update(id: number, patch: Partial<NewEntity<T>>): Promise<T | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const updated = { ...current, ...patch };
    await this.store.put(this.entity, updated);
    return updated;
  }

  delete(id: number): Promise<boolean> {
    return this.store.delete(this.entity, id);
  }

  protected async findOne(predicate: (item: T) => boolean): Promise<T | null> {
    return (await this.all()).find(predicate) ?? null;
  }
}
