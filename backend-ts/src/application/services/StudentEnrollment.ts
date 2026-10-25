import { Usuario, Estudiante } from '../../domain/entities/Usuario';
import { UsuarioRepository, ListaParticipanteRepository, EstudianteRepository } from '../ports/repositories';
import { Clock } from '../ports/services';

export interface EnrollStudentInput {
  email: string;
  nombre: string;
  apellido: string;
  /** Si el usuario ya existe con otro nombre/apellido, los sobrescribe. */
  syncNames?: boolean;
}

export interface EnrollStudentResult {
  usuario: Usuario;
  estudiante: Estudiante;
  usuarioCreado: boolean;
  estudianteCreado: boolean;
}

/** Garantiza la tríada Usuario + ListaParticipante + Estudiante para un alumno. */
export class StudentEnrollment {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly listas: ListaParticipanteRepository,
    private readonly estudiantes: EstudianteRepository,
    private readonly clock: Clock,
  ) {}

  async ensure({ email, nombre, apellido, syncNames = false }: EnrollStudentInput): Promise<EnrollStudentResult> {
    let usuario = await this.usuarios.findByEmail(email);
    const usuarioCreado = !usuario;
    if (!usuario) {
      usuario = await this.usuarios.create({
        email,
        nombre,
        apellido,
        tipoUsuario: 'ESTUDIANTE',
        fechaCreacion: this.clock.now(),
        estado: 'ACTIVO',
        isActive: true,
        passwordHash: null,
      });
    } else if (syncNames && (usuario.nombre !== nombre || usuario.apellido !== apellido)) {
      usuario = (await this.usuarios.update(usuario.id, { nombre, apellido })) as Usuario;
    }

    let lista = await this.listas.findByEmail(usuario.email);
    if (!lista) {
      lista = await this.listas.create({ emailEstudiante: usuario.email, nombreEstudiante: usuario.nombre });
    }

    let estudiante = await this.estudiantes.findByUsuarioId(usuario.id);
    const estudianteCreado = !estudiante;
    if (!estudiante) {
      estudiante = await this.estudiantes.create({ usuarioId: usuario.id, listaParticipanteId: lista.id });
    } else if (estudiante.listaParticipanteId !== lista.id) {
      estudiante = (await this.estudiantes.update(estudiante.id, { listaParticipanteId: lista.id })) as Estudiante;
    }

    return { usuario, estudiante, usuarioCreado, estudianteCreado };
  }
}
