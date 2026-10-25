import { createExpressApp } from '../infrastructure/http/adapters/express';
import { createRouter } from './container';

const port = Number(process.env.PORT ?? 8000);

createRouter().then((router) => {
  createExpressApp(router).listen(port, () => console.log(`API escuchando en http://localhost:${port}/api`));
});
