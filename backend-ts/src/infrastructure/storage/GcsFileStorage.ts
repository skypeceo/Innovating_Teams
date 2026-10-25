import { Storage } from '@google-cloud/storage';
import { FileStorage, SignedUpload, SignedUploadRequest } from '../../application/ports/services';

export interface GcsConfig {
  bucketName: string;
  credentialsFile: string;
  projectId?: string;
}

export class GcsFileStorage implements FileStorage {
  private readonly storage: Storage;

  constructor(private readonly config: GcsConfig) {
    this.storage = new Storage({ keyFilename: config.credentialsFile, projectId: config.projectId });
  }

  async createSignedUpload({ objectName, contentType, expiresInSeconds }: SignedUploadRequest): Promise<SignedUpload> {
    const [uploadUrl] = await this.storage
      .bucket(this.config.bucketName)
      .file(objectName)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + expiresInSeconds * 1000,
        contentType,
      });
    return { uploadUrl, publicUrl: `https://storage.googleapis.com/${this.config.bucketName}/${objectName}` };
  }
}

/** Reemplazo para desarrollo sin credenciales: falla de forma explícita al usarse. */
export class UnconfiguredFileStorage implements FileStorage {
  async createSignedUpload(): Promise<SignedUpload> {
    throw new Error('GCS_BUCKET_NAME or GCS_CREDENTIALS_FILE not configured');
  }
}
