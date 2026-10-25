export interface Equipo {
  id: number;
  nombreEquipo: string;
  tamanoEquipo: number | null;
  codigoEquipo: string | null;
}

export interface SolucionLego {
  id: number;
  equipoId: number;
  fechaCreacion: Date;
  descripSoluc: string | null;
  fotoPrototipUrl: string | null;
}
