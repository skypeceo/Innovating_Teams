export interface PasswordHasher {
  verify(plain: string, hash: string | null): Promise<boolean>;
  hash(plain: string): Promise<string>;
}

export interface TokenGenerator {
  generate(): string;
}

export interface Clock {
  now(): Date;
}

export interface Randomizer {
  /** Entero en [min, max]. */
  int(min: number, max: number): number;
  shuffle<T>(items: T[]): T[];
  uuid(): string;
}

export interface SignedUploadRequest {
  objectName: string;
  contentType: string;
  expiresInSeconds: number;
}

export interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
}

export interface FileStorage {
  createSignedUpload(request: SignedUploadRequest): Promise<SignedUpload>;
}
