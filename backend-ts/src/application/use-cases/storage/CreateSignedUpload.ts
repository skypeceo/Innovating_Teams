import { ValidationError } from '../../../domain/errors';
import { Clock, FileStorage } from '../../ports/services';

export interface CreateSignedUploadOutput {
  uploadUrl: string;
  publicUrl: string;
  filename: string;
  expiresIn: number;
}

export class CreateSignedUpload {
  constructor(
    private readonly storage: FileStorage,
    private readonly clock: Clock,
    private readonly expiresInSeconds = 3600,
  ) {}

  async execute(input: { grupoId?: string; ext?: string }): Promise<CreateSignedUploadOutput> {
    const ext = (input.ext ?? 'png').replace(/^\.+/, '');
    if (!ext) throw new ValidationError('ext parameter is required');

    const filename = `soluciones/group_${input.grupoId ?? '0'}_${Math.floor(this.clock.now().getTime() / 1000)}.${ext}`;
    const lower = ext.toLowerCase();
    const contentType = lower === 'jpg' || lower === 'jpeg' ? 'image/jpeg' : `image/${lower}`;

    const { uploadUrl, publicUrl } = await this.storage.createSignedUpload({
      objectName: filename,
      contentType,
      expiresInSeconds: this.expiresInSeconds,
    });
    return { uploadUrl, publicUrl, filename, expiresIn: this.expiresInSeconds };
  }
}
