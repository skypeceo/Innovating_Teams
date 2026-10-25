import { createRouter } from '../src/main/container';
import { Router } from '../src/infrastructure/http/router';
import { FileStorage } from '../src/application/ports/services';

export const fakeStorage: FileStorage = {
  createSignedUpload: async ({ objectName }) => ({
    uploadUrl: `https://upload.test/${objectName}`,
    publicUrl: `https://public.test/${objectName}`,
  }),
};

export const buildApi = async () => {
  const router: Router = await createRouter({ env: {}, seed: true, fileStorage: fakeStorage });
  const call = async (method: string, path: string, body: Record<string, unknown> = {}, query: Record<string, string> = {}) => {
    const res = await router.handle({ method, path, query, headers: {}, body, files: {} });
    return { status: res.status, body: res.body as any, headers: res.headers };
  };
  return { router, call };
};
