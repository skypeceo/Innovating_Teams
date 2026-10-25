import Busboy from 'busboy';
import { UploadedFile } from './types';

export interface ParsedBody {
  body: Record<string, unknown>;
  files: Record<string, UploadedFile>;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** Interpreta el cuerpo crudo según el Content-Type: JSON, formulario o multipart. */
export const parseBody = async (contentType: string | undefined, raw: Buffer): Promise<ParsedBody> => {
  const type = (contentType ?? '').toLowerCase();
  if (raw.length === 0) return { body: {}, files: {} };

  if (type.includes('multipart/form-data')) return parseMultipart(contentType!, raw);

  if (type.includes('application/x-www-form-urlencoded')) {
    return { body: Object.fromEntries(new URLSearchParams(raw.toString('utf8'))), files: {} };
  }

  try {
    return { body: asRecord(JSON.parse(raw.toString('utf8'))), files: {} };
  } catch {
    throw new SyntaxError('JSON inválido');
  }
};

const parseMultipart = (contentType: string, raw: Buffer): Promise<ParsedBody> =>
  new Promise((resolve, reject) => {
    const body: Record<string, unknown> = {};
    const files: Record<string, UploadedFile> = {};
    const busboy = Busboy({ headers: { 'content-type': contentType } });

    busboy.on('field', (name, value) => {
      body[name] = value;
    });
    busboy.on('file', (name, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        files[name] = { filename: info.filename ?? '', content: Buffer.concat(chunks) };
      });
    });
    busboy.on('error', reject);
    busboy.on('close', () => resolve({ body, files }));
    busboy.end(raw);
  });
