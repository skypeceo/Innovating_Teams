export interface Curso {
  id: number;
  carreraId: number;
  tipoCursoId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface Video {
  id: number;
  nombreVideo: string;
  url: string;
  partidaId: number | null;
}
