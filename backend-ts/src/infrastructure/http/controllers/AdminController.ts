import {
  CreateDesafio,
  DeleteDesafio,
  GetDesafio,
  ListDesafios,
  UpdateDesafio,
} from '../../../application/use-cases/admin/desafios';
import { CreatePersona, ListPersonas } from '../../../application/use-cases/admin/personas';
import { AuthorizeRole } from '../../../application/use-cases/auth/AuthorizeRole';
import { CreateTema, DeleteTema, GetTema, ListTemas, UpdateTema } from '../../../application/use-cases/admin/temas';
import { Handler, HttpRequest, HttpResponse } from '../types';
import { failAdmin, ok, positiveInt } from '../responses';
import { desafioBaseJson, desafioViewJson, personaJson, temaJson, temaWithCountJson } from '../presenters';
import { Router } from '../router';

export interface AdminUseCases {
  authorize: AuthorizeRole;
  listTemas: ListTemas;
  getTema: GetTema;
  createTema: CreateTema;
  updateTema: UpdateTema;
  deleteTema: DeleteTema;
  listDesafios: ListDesafios;
  getDesafio: GetDesafio;
  createDesafio: CreateDesafio;
  updateDesafio: UpdateDesafio;
  deleteDesafio: DeleteDesafio;
  listPersonas: ListPersonas;
  createPersona: CreatePersona;
}

export class AdminController {
  constructor(private readonly uc: AdminUseCases) {}

  /** Exige token de administrador y envuelve el caso de uso en el formato `{ success, data | error }` del módulo admin. */
  private admin =
    (run: (req: HttpRequest) => Promise<HttpResponse>): Handler =>
    async (req) => {
      try {
        await this.uc.authorize.execute(req.headers.authorization, 'ADMINISTRADOR');
        return await run(req);
      } catch (error) {
        return failAdmin(error);
      }
    };

  register(router: Router): void {
    router
      .add('GET', '/admin/temas', this.listarTemas)
      .add('POST', '/admin/temas', this.crearTema)
      .add('GET', '/admin/temas/:id', this.obtenerTema)
      .add('PUT', '/admin/temas/:id', this.actualizarTema)
      .add('DELETE', '/admin/temas/:id', this.eliminarTema)
      .add('GET', '/admin/desafios', this.listarDesafios)
      .add('POST', '/admin/desafios', this.crearDesafio)
      .add('GET', '/admin/desafios/:id', this.obtenerDesafio)
      .add('PUT', '/admin/desafios/:id', this.actualizarDesafio)
      .add('DELETE', '/admin/desafios/:id', this.eliminarDesafio)
      .add('GET', '/admin/personas', this.listarPersonas)
      .add('POST', '/admin/personas', this.crearPersona);
  }

  private listarTemas = this.admin(async () => ok({ success: true, data: (await this.uc.listTemas.execute()).map(temaWithCountJson) }));

  private crearTema = this.admin(async ({ body }) =>
    ok({ success: true, data: temaWithCountJson(await this.uc.createTema.execute(body)), message: 'Tema creado exitosamente' }, 201));

  private obtenerTema = this.admin(async ({ params }) =>
    ok({ success: true, data: temaWithCountJson(await this.uc.getTema.execute(positiveInt(params.id))) }));

  private actualizarTema = this.admin(async ({ params, body }) =>
    ok({
      success: true,
      data: temaJson(await this.uc.updateTema.execute(positiveInt(params.id), body)),
      message: 'Tema actualizado exitosamente',
    }));

  private eliminarTema = this.admin(async ({ params }) => {
    await this.uc.deleteTema.execute(positiveInt(params.id));
    return ok({ success: true, message: 'Tema eliminado exitosamente' });
  });

  private listarDesafios = this.admin(async ({ query }) => {
    const r = await this.uc.listDesafios.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      temaId: query.tema_id,
    });
    return ok({ success: true, data: { desafios: r.desafios.map(desafioViewJson), pagination: r.pagination } });
  });

  private crearDesafio = this.admin(async ({ body }) =>
    ok({ success: true, data: desafioBaseJson(await this.uc.createDesafio.execute(body)), message: 'Desafío creado exitosamente' }, 201));

  private obtenerDesafio = this.admin(async ({ params }) =>
    ok({ success: true, data: desafioViewJson(await this.uc.getDesafio.execute(positiveInt(params.id))) }));

  private actualizarDesafio = this.admin(async ({ params, body }) =>
    ok({
      success: true,
      data: desafioBaseJson(await this.uc.updateDesafio.execute(positiveInt(params.id), body)),
      message: 'Desafío actualizado exitosamente',
    }));

  private eliminarDesafio = this.admin(async ({ params }) => {
    await this.uc.deleteDesafio.execute(positiveInt(params.id));
    return ok({ success: true, message: 'Desafío eliminado exitosamente' });
  });

  private listarPersonas = this.admin(async () =>
    ok({ success: true, data: (await this.uc.listPersonas.execute()).map((p) => ({ ...personaJson(p), edad: p.edad || 0 })) }));

  private crearPersona = this.admin(async ({ body }) =>
    ok({ success: true, data: personaJson(await this.uc.createPersona.execute(body)) }, 201));
}
