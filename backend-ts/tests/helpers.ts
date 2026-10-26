import { randomUUID } from 'node:crypto';
import { createRouter } from '../src/main/container';
import { Router } from '../src/infrastructure/http/router';
import { FileStorage } from '../src/application/ports/services';

export const fakeStorage: FileStorage = {
  createSignedUpload: async ({ objectName }) => ({
    uploadUrl: `https://upload.test/${objectName}`,
    publicUrl: `https://public.test/${objectName}`,
  }),
};

// Con DYNAMODB_ENDPOINT (DynamoDB Local) la misma suite corre contra DynamoDB; una tabla nueva por test mantiene los ids del seed.
const env = (): NodeJS.ProcessEnv =>
  process.env.DYNAMODB_ENDPOINT
    ? { DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT, DYNAMODB_TABLE: `test-${randomUUID()}` }
    : {};

export const buildApi = async () => {
  const router: Router = await createRouter({ env: env(), seed: true, fileStorage: fakeStorage });
  const call = async (
    method: string,
    path: string,
    body: Record<string, unknown> = {},
    query: Record<string, string> = {},
    headers: Record<string, string> = {},
  ) => {
    const res = await router.handle({ method, path, query, headers, body, files: {} });
    return { status: res.status, body: res.body as any, headers: res.headers };
  };
  return { router, call };
};
