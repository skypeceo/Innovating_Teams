import { Estudiante, ListaParticipante, Usuario } from '../../../domain/entities/Usuario';
import {
  EstudianteRepository,
  ListaParticipanteRepository,
  PartidaUsuarioRepository,
  UsuarioRepository,
} from '../../ports/repositories';

export interface StudentDetail {
  estudiante: Estudiante;
  usuario: Usuario;
  listaParticipante: ListaParticipante | null;
}

export class GetStudentsByTeam {
  constructor(
    private readonly partidaUsuarios: PartidaUsuarioRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly estudiantes: EstudianteRepository,
    private readonly listas: ListaParticipanteRepository,
  ) {}

  async execute(equipoId: number): Promise<StudentDetail[]> {
    const result: StudentDetail[] = [];
    for (const usuarioId of await this.partidaUsuarios.findUsuarioIdsByEquipo(equipoId)) {
      const [usuario, estudiante] = await Promise.all([
        this.usuarios.findById(usuarioId),
        this.estudiantes.findByUsuarioId(usuarioId),
      ]);
      if (!usuario || !estudiante) continue;
      const listaParticipante = await this.listas.findById(estudiante.listaParticipanteId);
      result.push({ estudiante, usuario, listaParticipante });
    }
    return result;
  }
}
