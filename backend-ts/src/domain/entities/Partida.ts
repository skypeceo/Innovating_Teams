export interface Partida {
  id: number;
  fechaCreacion: Date;
  estado: string;
  codigoAcceso: string | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  maxEquipos: number | null;
  maxParticipantes: number | null;
}

export interface PartidaUsuario {
  id: number;
  usuarioId: number;
  partidaId: number;
  equipoId: number;
}

export interface ConexionPartida {
  id: number;
  partidaId: number;
  equipoId: number;
  usuarioId: number | null;
  codigoIngresado: string;
  timestampConexion: Date;
  activo: boolean;
}

export interface EstadoPartida {
  id: number;
  partidaId: number;
  estadoActual: string;
  faseActual: number;
  timestamp: Date;
  activo: boolean;
  mensaje: string | null;
}
