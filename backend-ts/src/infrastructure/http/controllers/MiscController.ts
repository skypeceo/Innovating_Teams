import { BulkCreateStudents } from '../../../application/use-cases/estudiantes/BulkCreateStudents';
import { GetStudentsByTeam } from '../../../application/use-cases/estudiantes/GetStudentsByTeam';
import { ListTeams } from '../../../application/use-cases/equipos/ListTeams';
import { GetTeamImage } from '../../../application/use-cases/soluciones/GetTeamImage';
import { SaveSolutionImage } from '../../../application/use-cases/soluciones/SaveSolutionImage';
import { CreateSignedUpload } from '../../../application/use-cases/storage/CreateSignedUpload';
import { Equipo } from '../../../domain/entities/Equipo';
import { Handler } from '../types';
import { fail, ok, positiveInt } from '../responses';
import { equipoJson, equipoV2Json, estudianteDetailJson } from '../presenters';
import { Router } from '../router';
import { canary } from '../canary';

export interface MiscUseCases {
  listTeams: ListTeams;
  getStudentsByTeam: GetStudentsByTeam;
  bulkCreateStudents: BulkCreateStudents;
  saveSolutionImage: SaveSolutionImage;
  getTeamImage: GetTeamImage;
  createSignedUpload: CreateSignedUpload;
}

/** Equipos, carga masiva de estudiantes, imágenes de solución y URLs firmadas. */
export class MiscController {
  constructor(
    private readonly uc: MiscUseCases,
    /** % de requests de GET /equipos que atiende la v2 (canario). */
    private readonly canaryPercent = 0,
  ) {}

  register(router: Router): void {
    router
      .add('GET', '/equipos', canary(this.listarEquipos(equipoJson), this.listarEquipos(equipoV2Json), this.canaryPercent))
      .add('GET', '/equipos/:equipoId/estudiantes', this.estudiantesPorEquipo)
      .add('POST', '/estudiantes/bulk_create', this.bulkCreate)
      .add('POST', '/guardar-imagen', this.guardarImagen)
      .add('GET', '/obtener-imagen', this.obtenerImagen)
      .add('GET', '/signed-url', this.signedUrl)
      .add('GET', '/storage/signed-url', this.signedUrl);
  }

  private listarEquipos =
    (present: (e: Equipo) => unknown): Handler =>
    async () => {
      try {
        return ok((await this.uc.listTeams.execute()).map(present));
      } catch (error) {
        return fail(error);
      }
    };

  private estudiantesPorEquipo: Handler = async ({ params }) => {
    try {
      return ok((await this.uc.getStudentsByTeam.execute(positiveInt(params.equipoId))).map(estudianteDetailJson));
    } catch (error) {
      return fail(error);
    }
  };

  private bulkCreate: Handler = async ({ body }) => {
    try {
      return ok(await this.uc.bulkCreateStudents.execute({ estudiantes: body.estudiantes }), 201);
    } catch (error) {
      return fail(error);
    }
  };

  private guardarImagen: Handler = async ({ body }) => {
    try {
      const r = await this.uc.saveSolutionImage.execute({
        equipoId: body.equipo_id,
        imageUrl: body.image_url,
        descripcion: body.descripcion,
      });
      return ok({
        success: true,
        message: 'Imagen guardada exitosamente',
        solucion_id: r.solucionId,
        image_url: r.imageUrl,
        created: r.created,
      });
    } catch (error) {
      return fail(error);
    }
  };

  private obtenerImagen: Handler = async ({ query }) => {
    try {
      const r = await this.uc.getTeamImage.execute({ teamId: query.team_id });
      if (!r.found) return ok({ success: false, message: 'No se encontró imagen para este equipo', has_image: false });
      return ok({ success: true, has_image: true, image_url: r.imageUrl, solucion_id: r.solucionId, team_id: r.teamId });
    } catch (error) {
      return fail(error);
    }
  };

  private signedUrl: Handler = async ({ query }) => {
    try {
      const r = await this.uc.createSignedUpload.execute({ grupoId: query.grupoId, ext: query.ext });
      return ok({ uploadUrl: r.uploadUrl, publicUrl: r.publicUrl, filename: r.filename, expires_in: r.expiresIn });
    } catch (error) {
      return fail(error);
    }
  };
}
