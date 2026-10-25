import { NewEntity } from '../../../application/ports/repositories';
import { ManageEntity } from '../../../application/use-cases/crud/ManageEntity';
import { NotFoundError } from '../../../domain/errors';
import { Handler, HttpRequest, HttpResponse } from '../types';
import { noContent, ok, positiveInt } from '../responses';
import { Router } from '../router';

export interface FieldSpec {
  json: string;
  prop: string;
  kind: 'string' | 'email' | 'int';
  required?: boolean;
  nullable?: boolean;
}

type FieldErrors = Record<string, string[]>;

export interface CrudSpec<T extends { id: number }> {
  fields: FieldSpec[];
  /** Valores para las propiedades que no vienen del cliente (se aplican solo al crear). */
  defaults?: () => Partial<NewEntity<T>>;
  toJson(entity: T): unknown | Promise<unknown>;
  /** Reglas de negocio adicionales (p. ej. unicidad). Devuelve errores por campo. */
  validate?(data: Partial<NewEntity<T>>, id?: number): Promise<FieldErrors | undefined>;
}

const notFound = (): HttpResponse => ({ status: 404, body: { detail: 'Not found.' } });

/** Expone un ManageEntity como recurso REST con la misma semántica que un ModelViewSet de DRF. */
export class CrudController<T extends { id: number }> {
  constructor(
    private readonly useCases: ManageEntity<T>,
    private readonly spec: CrudSpec<T>,
  ) {}

  register(router: Router, basePath: string): void {
    router
      .add('GET', basePath, this.list)
      .add('POST', basePath, this.create)
      .add('GET', `${basePath}/:id`, this.withId(this.retrieve))
      .add('PUT', `${basePath}/:id`, this.withId((req, id) => this.save(req, id, false)))
      .add('PATCH', `${basePath}/:id`, this.withId((req, id) => this.save(req, id, true)))
      .add('DELETE', `${basePath}/:id`, this.withId(this.destroy));
  }

  private withId =
    (fn: (req: HttpRequest, id: number) => Promise<HttpResponse>): Handler =>
    async (req) => {
      const id = positiveInt(req.params.id);
      return Number.isNaN(id) ? notFound() : fn(req, id);
    };

  private list: Handler = async () => ok(await Promise.all((await this.useCases.list()).map((e) => this.spec.toJson(e))));

  private create: Handler = async (req) => {
    const parsed = this.readBody(req.body, false);
    if ('errors' in parsed) return { status: 400, body: parsed.errors };
    const data = { ...this.spec.defaults?.(), ...parsed.data } as Partial<NewEntity<T>>;
    const errors = await this.spec.validate?.(data);
    if (errors) return { status: 400, body: errors };
    return ok(await this.spec.toJson(await this.useCases.create(data as NewEntity<T>)), 201);
  };

  private retrieve = async (_req: HttpRequest, id: number) => this.notFoundAware(async () =>
    ok(await this.spec.toJson(await this.useCases.get(id))));

  private save = async (req: HttpRequest, id: number, partial: boolean) => {
    const parsed = this.readBody(req.body, partial);
    if ('errors' in parsed) return { status: 400, body: parsed.errors };
    const errors = await this.spec.validate?.(parsed.data, id);
    if (errors) return { status: 400, body: errors };
    return this.notFoundAware(async () => ok(await this.spec.toJson(await this.useCases.update(id, parsed.data))));
  };

  private destroy = async (_req: HttpRequest, id: number) =>
    this.notFoundAware(async () => {
      await this.useCases.remove(id);
      return noContent();
    });

  private async notFoundAware(action: () => Promise<HttpResponse>): Promise<HttpResponse> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof NotFoundError) return notFound();
      throw error;
    }
  }

  private readBody(body: Record<string, unknown>, partial: boolean) {
    const data: Record<string, unknown> = {};
    const errors: FieldErrors = {};

    for (const field of this.spec.fields) {
      const value = body[field.json];
      if (value === undefined) {
        if (field.required && !partial) errors[field.json] = ['This field is required.'];
        else if (field.nullable && !partial) data[field.prop] = null;
        continue;
      }
      if (value === null) {
        if (field.nullable) data[field.prop] = null;
        else errors[field.json] = ['This field may not be null.'];
        continue;
      }
      const error = this.check(field, value);
      if (error) errors[field.json] = [error];
      else data[field.prop] = field.kind === 'int' ? Number(value) : (value as string).trim();
    }

    return Object.keys(errors).length ? { errors } : { data: data as Partial<NewEntity<T>> };
  }

  private check(field: FieldSpec, value: unknown): string | null {
    if (field.kind === 'int') return Number.isInteger(Number(value)) && value !== '' ? null : 'A valid integer is required.';
    if (typeof value !== 'string') return 'Not a valid string.';
    if (!value.trim() && !field.nullable) return 'This field may not be blank.';
    if (field.kind === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())) return 'Enter a valid email address.';
    return null;
  }
}
