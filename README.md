Misión Emprende – Innovating Teams
==================================

Juego por equipos para enseñar emprendimiento: el **profesor** crea una partida y arma los grupos, los **estudiantes**
entran con un código de equipo y avanzan por fases (rompehielos, empatía, prototipo LEGO, pitch, evaluación) y el
**administrador** gestiona temas, desafíos y personas (arquetipos).

Arquitectura
------------
```
S3 sitio web ─▶ React (frontend/)
React  ──HTTPS──▶  API Gateway  ──▶  AWS Lambda (backend-ts/)  ──▶  DynamoDB (NoSQL, 1 tabla)
                                       ├─ firma subidas de fotos a S3
                                       └─ local: Express en :8000 con el mismo código
```
- **Serverless:** el backend corre como una sola Lambda detrás de API Gateway (`backend-ts/template.yaml`, AWS SAM).
  En local se usa el mismo router con Express (`npm run dev`).
- **Base NoSQL:** DynamoDB con diseño de una sola tabla (`pk` = entidad, `sk` = id). Sin `DYNAMODB_TABLE` el backend
  usa memoria (tests y demo rápida).
- **Despliegue canario**, en dos niveles:
  1. *Infraestructura:* `AutoPublishAlias` + `DeploymentPreference: Canary10Percent5Minutes` (CodeDeploy manda el 10%
     del tráfico a la versión nueva de la Lambda por 5 minutos). El header `X-App-Version` muestra qué versión respondió.
  2. *Aplicación:* `GET /api/equipos` tiene una v2 que recibe el `CANARY_PERCENT`% de las requests (por defecto 20).
     `X-Canary: true|false` fuerza una versión y `X-Version` indica cuál atendió.
- **Arquitectura hexagonal** (dominio → casos de uso → puertos ← adaptadores). Ver `backend-ts/README.md`.

Estructura
----------
- `backend-ts/` – API en TypeScript (reemplaza al antiguo backend Django).
- `backend-ts/postman/` – colección Postman con los 56 endpoints y un CSV de ejemplo.
- `frontend/` – React 18 + Tailwind (módulos `student`, `profesor`, `admin`). La URL de la API está en `src/config.js`
  (`REACT_APP_API_URL`; por defecto `http://localhost:8000/api`).

Correr en local
---------------
Backend (Node 20+):
```
cd backend-ts
npm install
npm run dev            # http://localhost:8000/api (datos en memoria + datos de prueba)
npm test               # 20 tests
```
Con DynamoDB Local (necesita Docker):
```
docker compose up -d   # DynamoDB Local en :8001
# PowerShell
$env:DYNAMODB_TABLE="innovating"; $env:DYNAMODB_ENDPOINT="http://localhost:8001"; npm run dev
```
Frontend:
```
cd frontend
npm install
npm start
```
Usuarios de prueba: `admin@demo.com / admin-demo-123`, `profesor@demo.com / profesor-demo-123`.
Partida de prueba: código `123456`, equipos `1234561` y `1234562`.

Demo de endpoints
-----------------
- Lista completa: `GET http://localhost:8000/api/endpoints` (generada desde el router).
- Postman: importar `backend-ts/postman/InnovatingTeams.postman_collection.json` y ejecutar las carpetas en orden.
- curl:
```
curl localhost:8000/api/endpoints
curl -X POST localhost:8000/api/login/admin -H "Content-Type: application/json" -d '{"email":"admin@demo.com","password":"admin-demo-123"}'
curl localhost:8000/api/admin/temas -H "Authorization: Token <token>"
curl -i localhost:8000/api/equipos -H "X-Canary: true"
```

Desplegar en AWS
----------------
Pensado para **AWS Academy Learner Lab** (`us-east-1`, la Lambda y CodeDeploy usan `LabRole`). Requisitos: AWS CLI v2
y las credenciales de *AWS Details → AWS CLI* en `~/.aws/credentials` (cambian en cada sesión del lab).

`template.yaml` crea todo: API Gateway + Lambda (canario 10% / 5 min) + DynamoDB + S3 (sitio web del frontend y fotos).
El Learner Lab no permite CloudFront, así que el frontend queda en HTTP (la cámara del navegador exige HTTPS; la foto se
puede subir desde archivo).
```
cd backend-ts
npm run build
aws s3 mb s3://innovating-artifacts-<cuenta>      # solo la primera vez
aws cloudformation package --template-file template.yaml --s3-bucket innovating-artifacts-<cuenta> --output-template-file packaged.yaml
aws cloudformation deploy --template-file packaged.yaml --stack-name innovating-teams --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
aws cloudformation describe-stacks --stack-name innovating-teams --query "Stacks[0].Outputs"   # ApiUrl, FrontendUrl, ...
```
Frontend (`frontend/.env.production` tiene `REACT_APP_API_URL` = `ApiUrl`):
```
cd frontend
npm run build
aws s3 sync build/ s3://<FrontendBucketName> --delete --exclude "soluciones/*"
```
Canario de infraestructura: volver a desplegar con `--parameter-overrides AppVersion=1.1.0`; durante 5 minutos el 10% de
las requests responde con `X-App-Version: 1.1.0` (se ve en CodeDeploy y con `curl -i`).
