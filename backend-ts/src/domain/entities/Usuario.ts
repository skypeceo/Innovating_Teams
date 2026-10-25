export type TipoUsuario = 'ESTUDIANTE' | 'PROFESOR' | 'ADMINISTRADOR' | string;

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  tipoUsuario: TipoUsuario;
  fechaCreacion: Date;
  estado: string | null;
  isActive: boolean;
  passwordHash: string | null;
}

export interface ListaParticipante {
  id: number;
  emailEstudiante: string;
  nombreEstudiante: string;
}

export interface Estudiante {
  id: number;
  usuarioId: number;
  listaParticipanteId: number;
}
