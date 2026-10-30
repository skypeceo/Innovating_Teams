import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileStorage, SignedUpload, SignedUploadRequest } from '../../application/ports/services';

export interface S3Config {
  bucketName: string;
  publicBaseUrl: string;
}

export class S3FileStorage implements FileStorage {
  constructor(
    private readonly config: S3Config,
    private readonly client = new S3Client({}),
  ) {}

  async createSignedUpload({ objectName, contentType, expiresInSeconds }: SignedUploadRequest): Promise<SignedUpload> {
    const command = new PutObjectCommand({ Bucket: this.config.bucketName, Key: objectName, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return { uploadUrl, publicUrl: `${this.config.publicBaseUrl}/${objectName}` };
  }
}
