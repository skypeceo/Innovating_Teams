import { NewEntity, Repository } from '../../../application/ports/repositories';

export class InMemoryRepository<T extends { id: number }> implements Repository<T> {
  protected readonly items = new Map<number, T>();
  private nextId = 1;

  protected all(): T[] {
    return [...this.items.values()].map((item) => ({ ...item }));
  }

  async findById(id: number): Promise<T | null> {
    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  async findAll(): Promise<T[]> {
    return this.all();
  }

  async create(data: NewEntity<T>): Promise<T> {
    const item = { ...data, id: this.nextId++ } as T;
    this.items.set(item.id, item);
    return { ...item };
  }

  async update(id: number, patch: Partial<NewEntity<T>>): Promise<T | null> {
    const current = this.items.get(id);
    if (!current) return null;
    const updated = { ...current, ...patch };
    this.items.set(id, updated);
    return { ...updated };
  }

  async delete(id: number): Promise<boolean> {
    return this.items.delete(id);
  }

  protected findOne(predicate: (item: T) => boolean): T | null {
    const found = this.all().find(predicate);
    return found ?? null;
  }
}
