# backend-ts

Reemplazo 100 % TypeScript del backend Django. Misma API (`/api/...`, mismos JSON), clean architecture,
serverless (AWS Lambda + API Gateway) y persistencia NoSQL (DynamoDB).

```
src/
  domain/          entidades y reglas puras (sin dependencias)
  application/     casos de uso + puertos (repositorios, hasher, storage, reloj)
  infrastructure/  adaptadores: persistencia (memoria / DynamoDB), seguridad, GCS, HTTP (router, controladores,
                   canario, Express, Lambda)
  main/            composición (container.ts), server.ts (local), lambda.ts (API Gateway)
tests/             contrato HTTP con el frontend, canario y adaptadores
template.yaml      AWS SAM: API Gateway + Lambda (canario CodeDeploy) + tabla DynamoDB
postman/           colección con todos los endpoints + CSV de ejemplo
```

## Uso

```bash
npm run dev        # http://localhost:8000/api (PORT para cambiarlo)
npm test           # 20 tests (en memoria); con DYNAMODB_ENDPOINT corren contra DynamoDB Local
npm run build      # dist/lambda.js (esbuild) para desplegar en Lambda
```

Variables: `PORT`, `CORS_ORIGIN`, `SEED_DATA=false`, `DYNAMODB_TABLE`, `DYNAMODB_ENDPOINT`, `APP_VERSION`,
`CANARY_PERCENT`, `S3_BUCKET`, `PUBLIC_BASE_URL` (fotos en S3; si no, GCS), `GCS_BUCKET_NAME`, `GCS_CREDENTIALS_FILE`, `GCS_PROJECT_ID`, `GCS_SIGNED_URL_EXPIRATION`,
`SEED_ADMIN_PASSWORD`, `SEED_PROFESOR_PASSWORD`.

## DynamoDB

`createStore()` en `main/container.ts` elige el `DocumentStore`: `DynamoStore` si hay `DYNAMODB_TABLE`, si no
`MemoryStore`. Los 15 repositorios (`infrastructure/persistence/repositories.ts`) son colecciones de documentos sobre
ese store, así que dominio, casos de uso y HTTP no saben qué base hay detrás.

Diseño de una sola tabla: `pk` = nombre de la entidad (`usuarios`, `partidas`, ...), `sk` = id numérico. Los ids
salen de un contador atómico (`pk = contador#<entidad>`). Los filtros por email/código se resuelven sobre la
partición de la entidad; si los datos crecen, agregar GSIs por `codigoAcceso` y `codigoEquipo`.

## Canario

- **Lambda (infraestructura):** `template.yaml` publica cada versión en el alias `live` y CodeDeploy le manda el 10%
  del tráfico durante 5 minutos (`Canary10Percent5Minutes`). `X-App-Version` muestra qué versión respondió.
- **API (aplicación):** `infrastructure/http/canary.ts` es un decorador de handlers. `GET /equipos` manda el
  `CANARY_PERCENT`% (por defecto 20) a la v2, que agrega `codigo_equipo`. `X-Canary: true|false` fuerza la versión y
  `X-Version` dice cuál atendió.

## Seguridad

`/admin/*` exige `Authorization: Token <token>` (el que devuelve `POST /login/admin`) de un usuario `ADMINISTRADOR`:
sin token o con token inválido responde 401 y con otro rol, 403.
