import { ManageEntity } from '../application/use-cases/crud/ManageEntity';
import { AuthenticateUser } from '../application/use-cases/auth/AuthenticateUser';
import { AuthorizeRole } from '../application/use-cases/auth/AuthorizeRole';
import { StudentEnrollment } from '../application/services/StudentEnrollment';
import { AssignGroups } from '../application/use-cases/partidas/AssignGroups';
import { AssignGroupsFromCsv } from '../application/use-cases/partidas/AssignGroupsFromCsv';
import { CreatePartida } from '../application/use-cases/partidas/CreatePartida';
import { GetCurrentState } from '../application/use-cases/partidas/GetCurrentState';
import { GetGroups } from '../application/use-cases/partidas/GetGroups';
import { JoinTeam } from '../application/use-cases/partidas/JoinTeam';
import { StartGame } from '../application/use-cases/partidas/StartGame';
import { ValidateAccessCode } from '../application/use-cases/partidas/ValidateAccessCode';
import { ValidateTeamCode } from '../application/use-cases/partidas/ValidateTeamCode';
import { BulkCreateStudents } from '../application/use-cases/estudiantes/BulkCreateStudents';
import { GetStudentsByTeam } from '../application/use-cases/estudiantes/GetStudentsByTeam';
import { ListTeams } from '../application/use-cases/equipos/ListTeams';
import { GetTeamImage } from '../application/use-cases/soluciones/GetTeamImage';
import { SaveSolutionImage } from '../application/use-cases/soluciones/SaveSolutionImage';
import { CreateSignedUpload } from '../application/use-cases/storage/CreateSignedUpload';
import { CreateDesafio, DeleteDesafio, GetDesafio, ListDesafios, UpdateDesafio } from '../application/use-cases/admin/desafios';
import { CreatePersona, ListPersonas } from '../application/use-cases/admin/personas';
import { CreateTema, DeleteTema, GetTema, ListTemas, UpdateTema } from '../application/use-cases/admin/temas';
import { FileStorage, PasswordHasher } from '../application/ports/services';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DocumentStore, DynamoStore, MemoryStore } from '../infrastructure/persistence/DocumentStore';
import {
  DocumentAuthTokenRepository,
  DocumentConexionPartidaRepository,
  DocumentCursoRepository,
  DocumentDesafioRepository,
  DocumentEquipoRepository,
  DocumentEstadoPartidaRepository,
  DocumentEstudianteRepository,
  DocumentListaParticipanteRepository,
  DocumentPartidaRepository,
  DocumentPartidaUsuarioRepository,
  DocumentPersonaRepository,
  DocumentSolucionLegoRepository,
  DocumentTemaDesafioRepository,
  DocumentUsuarioRepository,
  DocumentVideoRepository,
} from '../infrastructure/persistence/repositories';
import { seedDevelopmentData } from '../infrastructure/persistence/seed';
import { DjangoCompatiblePasswordHasher } from '../infrastructure/security/DjangoCompatiblePasswordHasher';
import { CryptoRandomizer, CryptoTokenGenerator, SystemClock } from '../infrastructure/security/services';
import { GcsFileStorage, UnconfiguredFileStorage } from '../infrastructure/storage/GcsFileStorage';
import { AdminController } from '../infrastructure/http/controllers/AdminController';
import { AuthController } from '../infrastructure/http/controllers/AuthController';
import { CrudController } from '../infrastructure/http/controllers/CrudController';
import { cursoSpec, estudianteSpec, usuarioSpec, videoSpec } from '../infrastructure/http/controllers/crudSpecs';
import { MiscController } from '../infrastructure/http/controllers/MiscController';
import { PartidaController } from '../infrastructure/http/controllers/PartidaController';
import { Router } from '../infrastructure/http/router';
import { ok } from '../infrastructure/http/responses';

export type Repositories = ReturnType<typeof createRepositories>;

/** Cada repositorio es una colección de documentos (nombre de la entidad) dentro del mismo store. */
export const createRepositories = (store: DocumentStore) => ({
  usuarios: new DocumentUsuarioRepository(store, 'usuarios'),
  listas: new DocumentListaParticipanteRepository(store, 'listas'),
  estudiantes: new DocumentEstudianteRepository(store, 'estudiantes'),
  partidas: new DocumentPartidaRepository(store, 'partidas'),
  equipos: new DocumentEquipoRepository(store, 'equipos'),
  partidaUsuarios: new DocumentPartidaUsuarioRepository(store, 'partidaUsuarios'),
  conexiones: new DocumentConexionPartidaRepository(store, 'conexiones'),
  estados: new DocumentEstadoPartidaRepository(store, 'estados'),
  soluciones: new DocumentSolucionLegoRepository(store, 'soluciones'),
  temas: new DocumentTemaDesafioRepository(store, 'temas'),
  personas: new DocumentPersonaRepository(store, 'personas'),
  desafios: new DocumentDesafioRepository(store, 'desafios'),
  cursos: new DocumentCursoRepository(store, 'cursos'),
  videos: new DocumentVideoRepository(store, 'videos'),
  tokens: new DocumentAuthTokenRepository(store, 'tokens'),
});

/**
 * Único punto donde se elige la persistencia: DynamoDB si hay DYNAMODB_TABLE (en Lambda la define template.yaml),
 * o memoria para tests y desarrollo. DYNAMODB_ENDPOINT apunta a DynamoDB Local.
 */
const createStore = async (env: NodeJS.ProcessEnv): Promise<DocumentStore> => {
  if (!env.DYNAMODB_TABLE) return new MemoryStore();
  const endpoint = env.DYNAMODB_ENDPOINT;
  const client = new DynamoDBClient(
    endpoint ? { endpoint, region: 'local', credentials: { accessKeyId: 'local', secretAccessKey: 'local' } } : {},
  );
  const store = new DynamoStore(env.DYNAMODB_TABLE, client);
  if (endpoint) await store.ensureTable();
  return store;
};

const createFileStorage = (env: NodeJS.ProcessEnv): FileStorage =>
  env.GCS_BUCKET_NAME && env.GCS_CREDENTIALS_FILE
    ? new GcsFileStorage({
        bucketName: env.GCS_BUCKET_NAME,
        credentialsFile: env.GCS_CREDENTIALS_FILE,
        projectId: env.GCS_PROJECT_ID,
      })
    : new UnconfiguredFileStorage();

export interface ContainerOptions {
  env?: NodeJS.ProcessEnv;
  repositories?: Repositories;
  fileStorage?: FileStorage;
  hasher?: PasswordHasher;
  seed?: boolean;
}

export const createRouter = async ({
  env = process.env,
  repositories,
  fileStorage = createFileStorage(env),
  hasher = new DjangoCompatiblePasswordHasher(),
  seed = env.SEED_DATA !== 'false',
}: ContainerOptions = {}): Promise<Router> => {
  const repos = repositories ?? createRepositories(await createStore(env));
  if (seed) await seedDevelopmentData(repos, hasher);

  const clock = new SystemClock();
  const random = new CryptoRandomizer();
  const enrollment = new StudentEnrollment(repos.usuarios, repos.listas, repos.estudiantes, clock);
  const createPartida = new CreatePartida(repos.partidas, clock, random);

  const router = new Router(env.CORS_ORIGIN ?? '*', env.APP_VERSION ?? 'dev');

  new AuthController(
    new AuthenticateUser(repos.usuarios, repos.tokens, hasher, new CryptoTokenGenerator()),
  ).register(router);

  new PartidaController({
    createPartida,
    validateAccessCode: new ValidateAccessCode(repos.partidas),
    validateTeamCode: new ValidateTeamCode(repos.partidas, repos.equipos, repos.conexiones),
    joinTeam: new JoinTeam(repos.usuarios, repos.equipos, repos.partidas, repos.partidaUsuarios, clock),
    assignGroups: new AssignGroups(repos.partidas, repos.equipos, repos.partidaUsuarios, enrollment),
    assignGroupsFromCsv: new AssignGroupsFromCsv(createPartida, repos.equipos, repos.partidaUsuarios, enrollment, random),
    getGroups: new GetGroups(repos.partidas, repos.equipos, repos.conexiones, repos.partidaUsuarios, repos.usuarios),
    startGame: new StartGame(repos.partidas, repos.estados, clock),
    getCurrentState: new GetCurrentState(repos.estados),
  }).register(router);

  new MiscController({
    listTeams: new ListTeams(repos.equipos),
    getStudentsByTeam: new GetStudentsByTeam(repos.partidaUsuarios, repos.usuarios, repos.estudiantes, repos.listas),
    bulkCreateStudents: new BulkCreateStudents(enrollment),
    saveSolutionImage: new SaveSolutionImage(repos.equipos, repos.soluciones, clock),
    getTeamImage: new GetTeamImage(repos.soluciones),
    createSignedUpload: new CreateSignedUpload(fileStorage, clock, Number(env.GCS_SIGNED_URL_EXPIRATION ?? 3600)),
  }, Number(env.CANARY_PERCENT ?? 20)).register(router);

  new AdminController({
    authorize: new AuthorizeRole(repos.tokens, repos.usuarios),
    listTemas: new ListTemas(repos.temas, repos.desafios),
    getTema: new GetTema(repos.temas, repos.desafios),
    createTema: new CreateTema(repos.temas, repos.desafios),
    updateTema: new UpdateTema(repos.temas, repos.desafios),
    deleteTema: new DeleteTema(repos.temas, repos.desafios),
    listDesafios: new ListDesafios(repos.desafios, repos.temas, repos.personas),
    getDesafio: new GetDesafio(repos.desafios, repos.temas, repos.personas),
    createDesafio: new CreateDesafio(repos.desafios, repos.temas, repos.personas, clock),
    updateDesafio: new UpdateDesafio(repos.desafios, repos.temas, repos.personas),
    deleteDesafio: new DeleteDesafio(repos.desafios, repos.temas, repos.personas),
    listPersonas: new ListPersonas(repos.personas),
    createPersona: new CreatePersona(repos.personas),
  }).register(router);

  new CrudController(new ManageEntity(repos.usuarios, 'Usuario'), usuarioSpec(repos.usuarios, clock)).register(router, '/usuarios');
  new CrudController(
    new ManageEntity(repos.estudiantes, 'Estudiante'),
    estudianteSpec(repos.usuarios, repos.listas, repos.estudiantes),
  ).register(router, '/estudiantes');
  new CrudController(new ManageEntity(repos.cursos, 'Curso'), cursoSpec).register(router, '/cursos');
  new CrudController(new ManageEntity(repos.videos, 'Video'), videoSpec).register(router, '/videos');

  router.add('GET', '/endpoints', async () => ok(router.list()));

  return router;
};
