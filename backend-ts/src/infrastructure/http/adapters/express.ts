import express, { Express } from 'express';
import { parseBody } from '../body';
import { Router } from '../router';

const toRecord = (source: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(source).map(([k, v]) => [k, String(Array.isArray(v) ? v[0] : v)]));

/** Servidor HTTP para desarrollo local: delega todo el enrutamiento en el Router compartido. */
export const createExpressApp = (router: Router, prefix = '/api'): Express => {
  const app = express();

  app.use(prefix, express.raw({ type: () => true, limit: '10mb' }), async (req, res) => {
    try {
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const { body, files } = await parseBody(req.headers['content-type'], raw);
      const response = await router.handle({
        method: req.method,
        path: req.path,
        query: toRecord(req.query as Record<string, unknown>),
        headers: toRecord(req.headers as Record<string, unknown>),
        body,
        files,
      });
      res.status(response.status).set(response.headers ?? {});
      if (response.body === undefined) res.end();
      else res.send(JSON.stringify(response.body));
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : 500;
      res.status(status).json({ error: error instanceof Error ? error.message : 'Error interno' });
    }
  });

  return app;
};
