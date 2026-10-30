import { S3Client } from '@aws-sdk/client-s3';
import { S3FileStorage } from '../src/infrastructure/storage/S3FileStorage';

describe('S3FileStorage', () => {
  it('firma un PUT al bucket y arma la URL pública', async () => {
    const client = new S3Client({ region: 'us-east-1', credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });
    const storage = new S3FileStorage({ bucketName: 'mi-bucket', publicBaseUrl: 'https://cdn.example.com' }, client);

    const { uploadUrl, publicUrl } = await storage.createSignedUpload({
      objectName: 'soluciones/group_1_100.png',
      contentType: 'image/png',
      expiresInSeconds: 60,
    });

    expect(uploadUrl).toContain('mi-bucket');
    expect(uploadUrl).toContain('soluciones/group_1_100.png');
    expect(uploadUrl).toContain('X-Amz-Signature');
    expect(uploadUrl).toContain('X-Amz-Expires=60');
    expect(publicUrl).toBe('https://cdn.example.com/soluciones/group_1_100.png');
  });
});
