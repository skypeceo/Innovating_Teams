# backend-ts

Reemplazo 100 % TypeScript del backend Django. Misma API (`/api/...`, mismos JSON), clean architecture.

```
src/
  domain/          entidades y reglas puras (sin dependencias)
  application/     casos de uso + puertos (repositorios, hasher, storage, reloj)
  infrastructure/  adaptadores: persistencia en memoria, seguridad, GCS, HTTP (router, controladores, Express, Lambda)
  main/            composición (container.ts), server.ts (local), lambda.ts (API Gateway)
tests/             contrato HTTP con el frontend + adaptadores
```

## Uso

```bash
npm run dev        # http://localhost:8000/api (PORT para cambiarlo)
npm test           # 15 tests de contrato
npm run build      # dist/lambda.js (esbuild) para desplegar en Lambda
```

Variables: `PORT`, `CORS_ORIGIN`, `SEED_DATA=false`, `GCS_BUCKET_NAME`, `GCS_CREDENTIALS_FILE`,
`GCS_PROJECT_ID`, `GCS_SIGNED_URL_EXPIRATION`, `SEED_ADMIN_PASSWORD`, `SEED_PROFESOR_PASSWORD`.

## Pasar a DynamoDB

Implementar las interfaces de `application/ports/repositories.ts` (un adaptador por puerto) y devolverlas
desde `createRepositories()` en `main/container.ts`. Dominio, casos de uso y HTTP no cambian.
Puntos a resolver al diseñar la tabla: IDs (hoy enteros autoincrementales), GSI por `codigoAcceso` y
`codigoEquipo`, y escrituras condicionales donde Django usaba `transaction.atomic()`.
