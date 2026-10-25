export interface UploadedFile {
  filename: string;
  content: Buffer;
}

export interface HttpRequest {
  method: string;
  /** Ruta sin el prefijo `/api` ni la barra final. */
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  files: Record<string, UploadedFile>;
  params: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export type Handler = (req: HttpRequest) => Promise<HttpResponse>;
