export interface TemaDesafio {
  id: number;
  nombreTema: string;
  descripcion: string;
  estado: string | null;
}

export interface Persona {
  id: number;
  nombrePersona: string;
  imagenUrl: string;
  contextoPersona: string;
  edad: number | null;
}

export interface Desafio {
  id: number;
  temaDesafioId: number;
  fechaCreacion: Date;
  titulo: string;
  descripcion: string;
  nombrePersona: string | null;
  edadPersona: number | null;
  contexto: string | null;
  estado: string | null;
  personaId: number;
}
