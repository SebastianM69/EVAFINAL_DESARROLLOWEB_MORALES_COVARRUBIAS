# VentasFix

Backoffice web y API REST autenticada para VentasFix.

## Fuente documental

La especificación vigente está fuera de este workspace:

`C:\Users\sandr\Desktop\VentasFix_SDD_CURRENT_R0_VALIDATED_20260914`

Antes de modificar producto, revisar `README_SDD.md`, `16_CURRENT_STATE.md`, `specs/`, `decisions/` y `17_AMBIGUITIES_RESOLVED.md`.

El paquete SDD R0 conserva la baseline documental. Este workspace contiene la implementación funcional contrastada contra esa baseline.

## Stack

- Node.js 24.19.x
- pnpm 12.4.1 mediante Corepack
- React 19 + Vite 8 + TypeScript
- NestJS 12 + TypeScript
- Prisma 7 + MySQL 8.4
- Playwright E2E
- Jest + Supertest
- Vitest + Testing Library

## Workspace

```text
apps/api    API NestJS, Prisma y MySQL
apps/web    Backoffice React
e2e/        Flujos Playwright ADMIN/USER
docker/     Inicialización MySQL
compose.yaml
```

## Requisitos

- Node.js `>=24.19.0 <25`
- Corepack habilitado
- Docker Desktop activo
- MySQL gestionado por `compose.yaml`

## Instalación

Crear `apps/api/.env` desde `apps/api/.env.example` y configurar, como mínimo:

`DATABASE_URL`, `SHADOW_DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `SWAGGER_ENABLED=true` y las variables `BOOTSTRAP_ADMIN_*`.

Para revisar Swagger localmente, `SWAGGER_ENABLED` debe estar en `true` y la API debe reiniciarse después de cambiarlo.

`apps/api/.env` está excluido del repositorio. Nunca publicar secretos.

## Base de datos

```bash
docker compose up -d
corepack pnpm --filter @ventasfix/api db:migrate
corepack pnpm --filter @ventasfix/api db:seed
```

## Desarrollo

Antes de iniciar una demo:

```bash
corepack pnpm --filter @ventasfix/api build
```

API estable para grabación:

```bash
corepack pnpm --filter @ventasfix/api start:demo
```

Frontend:

```bash
corepack pnpm --filter @ventasfix/web dev
```

Rutas principales:

- Web: `http://localhost:5173` o `http://127.0.0.1:5173`
- Login: `/login` — la raíz redirige automáticamente al login.
- Health: `http://localhost:3000/health`
- Swagger habilitado: `http://localhost:3000/api/docs`
- Swagger JSON: `http://localhost:3000/api/docs-json`

## Preparación limpia para grabación

El seed no cambia la contraseña de un administrador que ya existe. Para preparar una base de demostración desde cero, ejecutar conscientemente:

```bash
corepack pnpm --filter @ventasfix/api db:reset:demo
corepack pnpm --filter @ventasfix/api db:seed
```

El primer comando borra los datos de `ventasfix_dev` y reaplica las migraciones. El segundo crea el administrador usando la contraseña definida en `apps/api/.env`. No ejecutarlos si se desea conservar datos existentes.

## Quality gates

Desde la raíz:

```bash
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Las pruebas API de Jest se ejecutan serialmente porque las suites de integración comparten `ventasfix_test`.

## E2E

Los flujos Playwright cubren:

- ADMIN: login, dashboard, usuarios, creación de usuario, productos, creación de producto con imagen, clientes, creación de cliente y logout.
- USER: login, dashboard, ausencia de navegación de Usuarios, bloqueo directo de `/usuarios`, acceso a Productos y Clientes y logout.

Ejecutar:

```bash
corepack pnpm --filter @ventasfix/web test:e2e
```

El entorno E2E requiere API, web, MySQL y un navegador Chromium/Chrome disponible.

## Contrato funcional

- Base API: `/api/v1`
- Auth: login, refresh, logout y `/auth/me`
- CRUD usuarios: ADMIN-only
- CRUD productos: ADMIN + USER; multipart e imagen obligatoria en create
- CRUD clientes: ADMIN + USER
- Dashboard: conteos reales de usuarios, productos y clientes
- Media: `/media/products/:filename`
- Swagger y health públicos según configuración

Las respuestas públicas nunca incluyen passwords, hashes, refresh tokens ni rutas internas de almacenamiento.

## Entrega

El paquete de implementación debe entregarse como `EXF_MORALES_SEBASTIAN.zip`. No incluye `node_modules`, `dist`, `.env`, media local ni resultados temporales.

La evidencia de la indisponibilidad del template académico está en `EVIDENCIA_TEMPLATE_INACCESIBLE.txt`. El SDD documental actualizado se entrega separado del código.

## Repositorio

Código fuente:

`https://github.com/SebastianM69/EVAFINAL_DESARROLLOWEB_MORALES_COVARRUBIAS`
