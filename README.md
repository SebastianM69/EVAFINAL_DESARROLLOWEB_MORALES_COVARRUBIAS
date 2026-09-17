# VentasFix

Backoffice web para trabajadores de VentasFix y API REST autenticada para administrar usuarios, productos y clientes.

El proyecto implementa un flujo completo **React → API NestJS → Prisma → MySQL**, con autenticación, autorización por roles, validación de datos, persistencia, carga de imágenes, documentación OpenAPI/Swagger y pruebas automatizadas.

---

## 1. Propósito del proyecto

VentasFix necesita una aplicación interna para consultar y mantener información operativa de la empresa. La solución se divide en dos superficies coordinadas:

1. **Backoffice web**: interfaz React para iniciar sesión, consultar el dashboard y ejecutar operaciones CRUD sobre usuarios, productos y clientes.
2. **API REST**: backend NestJS que concentra autenticación, autorización, validación, reglas de negocio, persistencia, errores normalizados y documentación Swagger.

La interfaz no decide reglas críticas. El backend es la autoridad para:

- Identidad y sesión.
- Rol del usuario.
- Creación server-side de usuarios `USER`.
- Existencia de un único `ADMIN`.
- Validación y normalización de RUT, teléfono, correo, SKU y dinero.
- Cálculo del precio de venta con IVA.
- Validación de imágenes.
- Unicidad de usuarios, SKU y clientes.
- Protección del administrador único.
- Respuestas HTTP y contrato de errores.

El objetivo es que la aplicación sea demostrable, reproducible en Windows y verificable mediante API, frontend, Swagger, pruebas de integración y E2E.

---

## 2. Fuente documental y estado del proyecto

La fuente documental vigente es el paquete SDD entregado por separado del código. Dentro del workspace, la documentación operativa se referencia desde la raíz del proyecto.

Antes de modificar funcionalidades se deben revisar, en este orden:

1. `README_SDD.md`.
2. `16_CURRENT_STATE.md`.
3. La especificación funcional relevante en `specs/`.
4. La decisión arquitectónica relevante en `decisions/`.
5. `17_AMBIGUITIES_RESOLVED.md`.

La raíz del workspace es el directorio del proyecto (`.`):

Estado documental vigente:

- `R0`: baseline documental validada.
- `R1–R11`: implementación y verificación validadas.
- `R12`: pendiente de evidencia externa de entrega.
- Pendientes externos: completar la evidencia de entrega y enviar el ZIP académico con el nombre solicitado.
- La evidencia del template académico inaccesible está en `EVIDENCIA_TEMPLATE_INACCESIBLE.txt`.

Estado Git observado al actualizar este README:

- Rama: `master`.
- La rama local está adelantada respecto de `origin/master`.

### 2.1 Revisión técnica 2026-09-17

La revisión de integridad del flujo React → API → Prisma → MySQL corrigió:

- Rotación concurrente de refresh token con actualización compare-and-swap; el token anterior no puede reutilizarse.
- Rate limiting específico de login (`5/min/IP`) y refresh (`30/min/IP`), además del límite general (`120/min/IP`).
- Trim de entradas de texto antes de validar y rechazo de valores compuestos solo por espacios.
- Respuesta `404 RESOURCE_NOT_FOUND` para media inexistente y fallback 404 normalizado sin capturar rutas válidas.
- Selectores accesibles estables en el formulario de clientes para el flujo E2E.

Las rutas y reglas de negocio permanecen dentro del alcance R0–R11. No se agregaron dependencias ni se modificó la evidencia académica externa.

El SDD se entrega separado. La carpeta `docs/sdd` del workspace se conserva vacía intencionalmente para evitar duplicar una versión documental que puede quedar desactualizada.

---

## 3. Cómo se construyó la solución

La implementación siguió una secuencia de decisiones orientada a mantener el alcance controlado y verificable:

### 3.1 Baseline funcional

Se fijaron primero los requisitos observables:

- Backoffice para trabajadores.
- API REST autenticada.
- Roles `ADMIN` y `USER`.
- Un único administrador.
- CRUD de usuarios, productos y clientes.
- Dashboard con conteos reales.
- Swagger/OpenAPI.
- Pruebas unitarias, integración/API, componentes y E2E.

Las ambigüedades se cerraron antes de implementar: formato de errores, refresh token, normalización, dinero, multipart, imágenes, unicidad, roles y estados HTTP.

### 3.2 Workspace monorepo

Se eligió un monorepo pnpm para mantener en una misma raíz:

- Código de API.
- Código web.
- Pruebas E2E.
- Configuración de Docker.
- Configuración compartida de TypeScript, ESLint y Prettier.
- Un lockfile único y reproducible.

Esto facilita instalar, verificar y empaquetar el proyecto completo sin separar manualmente frontend y backend.

### 3.3 Persistencia y dominio

Se modelaron en Prisma las entidades `User`, `Product`, `Client` y `AuthSession`. Las reglas de integridad importantes se respaldan en el servicio de aplicación y en restricciones de base de datos:

- `User.rut` y `User.email` son únicos.
- `Product.sku` es único.
- `Client.rutEmpresa` es único.
- `AuthSession.refreshTokenHash` es único.
- Las relaciones de sesión con usuario usan eliminación en cascada.
- El arranque comprueba que, si existen usuarios, exista exactamente un `ADMIN`.

### 3.4 API modular

NestJS organiza la API por módulos de negocio:

- `AuthModule`.
- `UsersModule`.
- `ProductsModule`.
- `ClientsModule`.
- `DashboardModule`.
- `PrismaModule` global.

Los controllers traducen HTTP a operaciones de aplicación. Los guards autentican y autorizan. Los DTO validan entrada. Los services aplican reglas de negocio. `PrismaService` persiste en MySQL.

### 3.5 Backoffice web

React consume la API mediante un cliente HTTP centralizado. React Router controla las rutas. TanStack Query gestiona consultas, mutaciones e invalidación de caché. Los formularios usan React Hook Form, Zod y banners de estado para mostrar validaciones y errores.

### 3.6 Verificación

La verificación se distribuye en capas:

- Tests unitarios para reglas y servicios.
- Tests de integración/API contra MySQL de prueba.
- Tests de componentes React con Testing Library y Vitest.
- Auditoría de contrato OpenAPI.
- E2E Playwright con flujos ADMIN y USER.
- Quality gates de formato, lint, typecheck, tests y build.
- Smoke checks de health, Swagger, login, dashboard y frontend.

---

## 4. Stack tecnológico

| Tecnología                |  Versión fijada | Uso en VentasFix                             | Motivo de elección                                                      |
| ------------------------- | --------------: | -------------------------------------------- | ----------------------------------------------------------------------- |
| Node.js                   | `>=24.19.0 <25` | Runtime de API, scripts y herramientas       | Runtime único y moderno para todo el workspace.                         |
| pnpm                      |        `12.4.1` | Workspace, instalación y filtros por paquete | Lockfile único, instalación eficiente y comandos reproducibles.         |
| TypeScript                |         `5.9.3` | Tipado de frontend, backend y configuración  | Reduce errores de contrato y mantiene coherencia entre capas.           |
| React                     |        `19.3.0` | Interfaz del Backoffice                      | Componentización, composición y ecosistema maduro para UI.              |
| Vite                      |         `8.3.0` | Servidor de desarrollo y build web           | Arranque rápido y build simple para una SPA TypeScript.                 |
| React Router              |        `7.18.3` | Rutas públicas y protegidas                  | Control explícito de navegación, login y autorización de vistas.        |
| TanStack Query            |       `5.102.8` | Consultas, mutaciones e invalidación         | Separa estado remoto de estado visual y evita duplicar lógica de fetch. |
| React Hook Form           |        `7.88.0` | Formularios de usuarios                      | Manejo eficiente de formularios y errores de campo.                     |
| Zod                       |         `4.6.5` | Validación inmediata de formularios web      | Feedback temprano sin sustituir la validación server-side.              |
| NestJS                    |        `12.0.1` | Framework de la API                          | Módulos, guards, pipes, filtros e inyección de dependencias.            |
| `@nestjs/swagger`         |        `12.0.1` | OpenAPI y Swagger UI                         | Genera documentación desde controllers y DTOs reales.                   |
| `@nestjs/jwt`             |        `12.0.2` | Access tokens JWT                            | Autenticación stateless para llamadas protegidas.                       |
| Argon2                    |        `0.45.1` | Hash de passwords y refresh tokens           | Hashing resistente a ataques de fuerza bruta; se usa con Argon2id.      |
| Prisma                    |        `7.10.0` | ORM, schema y migraciones                    | Tipado del acceso a datos, migraciones y modelo centralizado.           |
| `@prisma/adapter-mariadb` |        `7.10.0` | Adaptador de conexión                        | Conecta Prisma con MySQL/MariaDB mediante el driver correspondiente.    |
| MySQL                     |           `8.4` | Persistencia local y de integración          | Motor relacional adecuado para restricciones, relaciones y conteos.     |
| `class-validator`         |        `0.15.1` | Validación de DTOs API                       | Reglas declarativas integradas con NestJS.                              |
| `class-transformer`       |         `0.5.1` | Transformación de entrada                    | Convierte campos multipart y parámetros antes de validar.               |
| `multer`                  |         `2.4.0` | Recepción de multipart                       | Permite recibir la imagen de producto en memoria.                       |
| `file-type`               |        `22.1.0` | Detección de firma real                      | No confía solamente en la extensión del archivo.                        |
| Helmet                    |         `8.3.0` | Cabeceras HTTP defensivas                    | Reduce exposición de la API mediante headers de seguridad.              |
| Throttler                 |         `6.5.0` | Rate limiting                                | Limita solicitudes excesivas en la API.                                 |
| Jest                      |        `30.5.1` | Tests API y unitarios                        | Tests seriales de servicios, guards, controllers e integración.         |
| Supertest                 |         `7.2.2` | Tests HTTP API                               | Ejecuta solicitudes reales contra la aplicación NestJS.                 |
| Vitest                    |         `5.0.0` | Tests frontend                               | Ejecución rápida de componentes y contexto de autenticación.            |
| Testing Library           |        `16.3.3` | Tests orientados al usuario                  | Verifica comportamiento observable de componentes.                      |
| Playwright                |        `1.63.0` | E2E web                                      | Valida navegación, roles, CRUD y flujo completo en navegador.           |
| Docker Compose            |   Compose local | MySQL de desarrollo                          | Aísla la base y evita depender de una instalación manual.               |

### 4.1 Criterios de selección

- **TypeScript en todas las capas**: permite compartir contratos conceptuales y detectar incompatibilidades antes de ejecutar.
- **NestJS**: ofrece una estructura clara para separar controllers, guards, DTOs, services y módulos.
- **Prisma**: centraliza el modelo relacional y las migraciones sin dispersar SQL de persistencia por los controllers.
- **MySQL**: cubre unicidad, relaciones, transacciones y conteos reales del dashboard.
- **JWT + refresh cookie**: el access token se usa en `Authorization`; el refresh token no se expone al JavaScript de la interfaz.
- **React Query**: evita implementar manualmente estados de carga, error, invalidación y sincronización de listados.
- **Swagger generado desde código**: reduce el riesgo de que la documentación describa DTOs o rutas que ya no existen.
- **Playwright**: comprueba el comportamiento integrado, no solamente funciones aisladas.

---

## 5. Estructura del workspace

```text
EVAFINAL_DESARROLLOWEB_MORALES_COVARRUBIAS/
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  │  ├─ migrations/              Migraciones versionadas.
│  │  │  ├─ schema.prisma            Modelo relacional.
│  │  │  └─ seed.ts                  Bootstrap seguro del administrador.
│  │  ├─ src/
│  │  │  ├─ auth/                    Login, refresh, logout, JWT y roles.
│  │  │  ├─ clients/                 CRUD de clientes.
│  │  │  ├─ common/                  Errores, requestId y validación.
│  │  │  ├─ config/                  Validación de ambiente.
│  │  │  ├─ dashboard/               Conteos del dashboard.
│  │  │  ├─ generated/               Cliente Prisma generado.
│  │  │  ├─ products/                CRUD e imágenes de productos.
│  │  │  ├─ prisma/                  Servicio y módulo Prisma.
│  │  │  ├─ users/                   CRUD de usuarios.
│  │  │  ├─ app.module.ts            Composición principal.
│  │  │  ├─ health.controller.ts     Health público.
│  │  │  └─ main.ts                  Bootstrap HTTP y Swagger.
│  │  ├─ .env.example                Plantilla de configuración local.
│  │  └─ package.json                Scripts y dependencias API.
│  └─ web/
│     ├─ src/
│     │  ├─ auth/                    Contexto, rutas protegidas y ADMIN.
│     │  ├─ components/              Layout y banners.
│     │  ├─ pages/                   Login, dashboard y mantenedores.
│     │  ├─ services/                Cliente HTTP centralizado.
│     │  ├─ test/                    Setup de Vitest.
│     │  ├─ types/                   Tipos de respuestas y formularios.
│     │  ├─ app-router.tsx           Rutas React.
│     │  └─ styles.css               Estilos del Backoffice.
│     ├─ .env.example                URL de la API para Vite.
│     └─ package.json                Scripts y dependencias web.
├─ e2e/
│  ├─ playwright.config.ts           Servidores API/web y navegador.
│  └─ ventasfix.spec.ts              Flujos ADMIN y USER.
├─ docker/
│  └─ mysql/init/                     Inicialización de bases locales.
├─ compose.yaml                      MySQL 8.4 en puerto 3307.
├─ eslint.config.mjs                 Lint del workspace.
├─ tsconfig.base.json                Configuración TypeScript común.
├─ pnpm-workspace.yaml               Paquetes del monorepo.
├─ pnpm-lock.yaml                    Versiones reproducibles.
├─ EVIDENCIA_TEMPLATE_INACCESIBLE.txt Evidencia académica.
└─ README.md                         Esta documentación.
```

---

## 6. Requisitos y preparación inicial

### 6.1 Requisitos de máquina

- Windows 10/11, macOS o Linux.
- Node.js `>=24.19.0 <25`.
- Corepack habilitado.
- pnpm `12.4.1` administrado por Corepack.
- Docker Desktop activo.
- Chrome instalado para E2E; Playwright usa el navegador configurado localmente.

### 6.2 Instalar dependencias

Desde la raíz del workspace:

```bash
corepack enable
corepack pnpm install
```

El lockfile `pnpm-lock.yaml` debe conservarse. No se deben mezclar versiones globales distintas si se busca reproducibilidad académica.

### 6.3 Configurar la API

Crear el archivo local desde la plantilla:

PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Bash:

```bash
cp apps/api/.env.example apps/api/.env
```

El archivo `.env` está excluido del repositorio. Nunca subirlo ni compartir tokens, passwords o URLs con credenciales.

### 6.4 Configurar el frontend

La aplicación web usa por defecto:

```text
http://localhost:3000/api/v1
```

Si se necesita una URL explícita, crear `apps/web/.env` desde `.env.example`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

Durante E2E, Playwright entrega esta variable automáticamente apuntando a `127.0.0.1`.

---

## 7. Variables de entorno

### API: `apps/api/.env`

| Variable                   | Ejemplo local                                 | Uso                                                         |
| -------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `NODE_ENV`                 | `development`                                 | Selecciona desarrollo, test o producción.                   |
| `PORT`                     | `3000`                                        | Puerto HTTP de NestJS.                                      |
| `WEB_ORIGIN`               | `http://localhost:5173`                       | Origen web permitido por CORS.                              |
| `DATABASE_URL`             | `mysql://...@localhost:3307/ventasfix_dev`    | Base de desarrollo.                                         |
| `SHADOW_DATABASE_URL`      | `mysql://...@localhost:3307/ventasfix_shadow` | Base auxiliar para migraciones Prisma.                      |
| `TEST_DATABASE_URL`        | `mysql://...@localhost:3307/ventasfix_test`   | Base usada por integración API.                             |
| `JWT_ACCESS_SECRET`        | secreto local de 32+ caracteres               | Firma del access token. Nunca publicar.                     |
| `JWT_ACCESS_TTL`           | `15m`                                         | Vigencia del JWT de acceso.                                 |
| `REFRESH_TOKEN_TTL_DAYS`   | `7`                                           | Vigencia de la sesión refresh.                              |
| `SWAGGER_ENABLED`          | `true`                                        | Habilita `/api/docs` y `/api/docs-json`.                    |
| `BOOTSTRAP_ADMIN_RUT`      | `11111111-1`                                  | RUT del administrador inicial.                              |
| `BOOTSTRAP_ADMIN_NAME`     | `Administrador`                               | Nombre del administrador inicial.                           |
| `BOOTSTRAP_ADMIN_LASTNAME` | `VentasFix`                                   | Apellido del administrador inicial.                         |
| `BOOTSTRAP_ADMIN_EMAIL`    | `admin@ventasfix.cl`                          | Correo del administrador inicial.                           |
| `BOOTSTRAP_ADMIN_PASSWORD` | `admin-password-123`                          | Password local de demostración. Cambiar en entornos reales. |

La configuración se valida al arrancar. Se rechaza, entre otros casos:

- Variables obligatorias ausentes.
- Secret JWT con menos de 32 caracteres.
- Puerto inválido.
- TTL de refresh no positivo.
- `NODE_ENV` distinto de `development`, `test` o `production`.

En producción Swagger puede mantenerse deshabilitado con `SWAGGER_ENABLED=false`.

---

## 8. Base de datos, Prisma y seed

### 8.1 MySQL con Docker

`compose.yaml` levanta MySQL `8.4`:

- Host: `localhost`.
- Puerto externo: `3307`.
- Puerto interno: `3306`.
- Base de desarrollo: `ventasfix_dev`.
- Usuario: `ventasfix`.
- Datos persistidos en el volumen `ventasfix_mysql_data`.
- Healthcheck mediante `mysqladmin ping`.

Iniciar:

```bash
docker compose up -d
docker compose ps
```

Continuar cuando el servicio `mysql` aparezca como `healthy`.

### 8.2 Migraciones

Aplicar migraciones de desarrollo:

```bash
corepack pnpm --filter @ventasfix/api db:migrate
```

Validar el schema:

```bash
corepack pnpm --filter @ventasfix/api db:validate
```

Generar el cliente Prisma si corresponde:

```bash
corepack pnpm --filter @ventasfix/api db:generate
```

La migración versionada se encuentra en:

```text
apps/api/prisma/migrations/20260914142815/
```

### 8.3 Seed seguro

Crear el administrador inicial:

```bash
corepack pnpm --filter @ventasfix/api db:seed
```

El seed:

1. Cuenta los usuarios existentes.
2. Si no hay usuarios, crea exactamente un `ADMIN` dentro de una transacción.
3. Hashea el password con Argon2id.
4. Normaliza el correo a minúsculas.
5. Si ya hay usuarios, no los modifica.
6. Si hay usuarios pero la cantidad de administradores no es exactamente uno, falla de forma segura.

No existe promoción automática ni reparación silenciosa de datos inconsistentes.

### 8.4 Reset de demo

Para una base local descartable:

```bash
corepack pnpm --filter @ventasfix/api db:reset:demo
corepack pnpm --filter @ventasfix/api db:seed
```

`db:reset:demo` es destructivo. Borra y reconstruye la base de desarrollo. No ejecutarlo sobre datos que se deban conservar.

### 8.5 Modelo de datos

#### `User`

- `id` autoincremental.
- `rut` único y canónico.
- `nombre`, `apellido` y `email`.
- `passwordHash`, nunca expuesto.
- `role`: `ADMIN` o `USER`.
- Timestamps internos.
- Relación con `AuthSession`.

#### `Product`

- `id` y `sku` único.
- Nombre y descripciones corta/larga.
- `imagePath` interno.
- `precioNeto` y `precioVenta` como `Decimal(12,2)`.
- Cuatro stocks enteros: actual, mínimo, bajo y alto.
- Timestamps internos.

#### `Client`

- `id`.
- `rutEmpresa` único y canónico.
- Rubro, razón social, teléfono, dirección, contacto y correo.
- Timestamps internos.

#### `AuthSession`

- Usuario asociado.
- Hash del refresh token, nunca el token en texto plano.
- Expiración y revocación.
- Índices por usuario y expiración.

---

## 9. Arquitectura y flujo de ejecución

### 9.1 Flujo general

```text
Usuario
  ↓
React Router + página React
  ↓
Cliente HTTP centralizado
  ↓  Authorization: Bearer <access-token>
NestJS Controller
  ↓
AccessTokenGuard / RolesGuard
  ↓
ValidationPipe + DTO
  ↓
Service de dominio
  ↓
PrismaService + adaptador MariaDB
  ↓
MySQL
```

Para respuestas de error:

```text
Excepción de controller/service/pipe
  ↓
HttpExceptionFilter
  ↓
statusCode + code + message + requestId + path + timestamp
  ↓
ApiClient / banner de estado / fieldErrors
```

### 9.2 Bootstrap de la API

`apps/api/src/main.ts` realiza estas tareas:

1. Crea la aplicación NestJS.
2. Lee y valida la configuración.
3. Activa Helmet.
4. Activa `cookie-parser`.
5. Limita JSON a 100 KiB.
6. Configura CORS con credenciales y orígenes explícitos.
7. Aplica el prefijo global `/api/v1`.
8. Deja públicos `/health` y `/media/products/:filename`.
9. Registra `ValidationPipe`.
10. Registra el filtro global de excepciones.
11. Configura `Cache-Control: no-store` para la API.
12. Publica Swagger en `/api/docs` si está habilitado.
13. Escucha en el puerto configurado.

### 9.3 Módulos NestJS

- **AuthModule**: login, refresh, logout, `/auth/me`, JWT y guards.
- **UsersModule**: CRUD ADMIN-only y protección del administrador único.
- **ProductsModule**: CRUD ADMIN/USER, multipart y media pública.
- **ClientsModule**: CRUD ADMIN/USER y normalización de cliente.
- **DashboardModule**: conteos paralelos de usuarios, productos y clientes.
- **PrismaModule**: conexión global, validación del invariante de ADMIN y desconexión limpia.

---

## 10. Autenticación y autorización

### 10.1 Login

`POST /api/v1/auth/login` recibe email y password.

- Verifica el password contra Argon2id.
- Devuelve `accessToken` y usuario público.
- Coloca el refresh token únicamente en cookie HttpOnly `ventasfix_refresh`.
- No devuelve password, hash ni refresh token en JSON.

### 10.2 Access token

Las rutas protegidas reciben:

```http
Authorization: Bearer <access-token>
```

El guard verifica:

- Existencia del header Bearer.
- Firma con `JWT_ACCESS_SECRET`.
- Emisor `ventasfix-api`.
- Audiencia `ventasfix-clients`.
- `sub` numérico.
- Email y rol presentes.

El access token tiene por defecto una vigencia de `15m` mediante `JWT_ACCESS_TTL`.

### 10.3 Refresh token

- Vive en cookie HttpOnly.
- Tiene vigencia por defecto de 7 días.
- Usa `SameSite=Lax`.
- Usa `Path=/api/v1/auth`.
- En producción configura `secure=true`.
- Se persiste únicamente como hash Argon2id.
- La rotación reemplaza el hash anterior.
- Un token anterior ya rotado responde `401 UNAUTHENTICATED`.

El frontend coordina como máximo un refresh concurrente. Las solicitudes simultáneas esperan la misma promesa y reintentan una sola vez.

### 10.4 Logout

`POST /api/v1/auth/logout`:

- Requiere refresh cookie válida.
- Revoca la sesión.
- Limpia la cookie.
- Responde `204 No Content`.

### 10.5 Roles

| Rol     | Dashboard | Usuarios | Productos | Clientes |
| ------- | --------- | -------- | --------- | -------- |
| `ADMIN` | Sí        | Sí       | Sí        | Sí       |
| `USER`  | Sí        | No       | Sí        | Sí       |

La autorización se aplica en backend mediante `AccessTokenGuard` y `RolesGuard`. La interfaz oculta navegación de Usuarios para `USER`, pero el backend también bloquea el acceso directo a la URL y responde `403 FORBIDDEN`.

### 10.6 Administrador único

- El seed crea un administrador solo en una base sin usuarios.
- La API no acepta `role` en create/update.
- Un usuario creado por API recibe `USER` server-side.
- El ADMIN único no puede eliminarse ni degradarse.
- La inconsistencia de cantidad de administradores detiene seed o arranque.

---

## 11. Contrato de errores

Todas las excepciones pasan por `HttpExceptionFilter` y usan un sobre consistente:

```json
{
  "statusCode": 422,
  "code": "VALIDATION_ERROR",
  "message": "La solicitud contiene datos inválidos.",
  "requestId": "uuid",
  "path": "/api/v1/productos",
  "timestamp": "2026-09-15T12:00:00.000Z",
  "fieldErrors": {
    "sku": ["Formato inválido."]
  }
}
```

Campos obligatorios:

- `statusCode`.
- `code`.
- `message`.
- `requestId`.
- `path`.
- `timestamp`.

`fieldErrors` aparece solo si el error está asociado a campos.

Códigos principales:

| HTTP | Código               | Uso                                          |
| ---: | -------------------- | -------------------------------------------- |
|  400 | `INVALID_PARAMETER`  | Parámetro de ruta malformado.                |
|  401 | `UNAUTHENTICATED`    | Falta o invalidez de autenticación.          |
|  403 | `FORBIDDEN`          | Rol sin permiso.                             |
|  404 | `RESOURCE_NOT_FOUND` | Recurso inexistente.                         |
|  409 | `RESOURCE_CONFLICT`  | Unicidad o regla de conflicto.               |
|  422 | `VALIDATION_ERROR`   | Body, multipart o regla de negocio inválida. |
|  429 | `RATE_LIMITED`       | Exceso de solicitudes.                       |
|  500 | `INTERNAL_ERROR`     | Falla interna sin detalles sensibles.        |

Los errores 500 no exponen stack trace, secretos, SQL ni rutas internas de almacenamiento.

---

## 12. Normalización y validación

### 12.1 RUT

- Acepta puntos, espacios y guion en la entrada.
- Valida dígito verificador chileno.
- Normaliza a `XXXXXXXX-X`.
- Almacena `K` en mayúscula.
- Usa la representación canónica para unicidad.

### 12.2 Teléfono

- Acepta espacios, guiones, paréntesis y prefijo `+`.
- La validación restringe caracteres permitidos.
- La API guarda y devuelve solamente dígitos.
- El valor normalizado debe tener entre 8 y 15 dígitos.

### 12.3 Correo

- Se valida formato de correo.
- Los usuarios deben pertenecer al dominio `ventasfix.cl`.
- Se normaliza a minúsculas antes de persistir.
- La unicidad se comprueba server-side.

### 12.4 Dinero e IVA

- La entrada usa string decimal no negativo.
- Se aceptan hasta dos decimales.
- No se redondea silenciosamente una entrada con exceso de precisión.
- El cálculo usa `decimal.js`, no `number` binario.
- `precioVenta = precioNeto × 1.19`, redondeado a dos decimales.
- `precioVenta` nunca es input del cliente.
- Los importes se devuelven como strings, por ejemplo `"100.00"` y `"119.00"`.

### 12.5 Productos e imágenes

- `POST /productos` usa `multipart/form-data`.
- El campo de archivo es `image`.
- Create requiere exactamente una imagen.
- Update permite omitir imagen y conserva la anterior.
- Se aceptan JPEG, PNG y WebP.
- Se valida firma real con `file-type`.
- El límite es 5 MiB.
- El archivo se guarda como `media/products/<uuid>.<extension>`.
- La base guarda un path relativo interno.
- La respuesta pública expone `imageUrl`, nunca `imagePath`.
- El nombre de media debe cumplir formato UUID para evitar traversal.
- Si falla persistencia después de guardar una imagen nueva, se intenta eliminar el archivo nuevo.
- En delete se elimina el registro y luego el archivo asociado.
- Media usa cache público inmutable.

---

## 13. API REST

Base de negocio:

```text
http://localhost:3000/api/v1
```

### 13.1 Autenticación

| Método | Ruta            | Acceso         | Respuesta                                              |
| ------ | --------------- | -------------- | ------------------------------------------------------ |
| `POST` | `/auth/login`   | Público        | `200`, access token, usuario público y cookie refresh. |
| `POST` | `/auth/refresh` | Refresh cookie | `200`, nuevo access token y cookie rotada.             |
| `POST` | `/auth/logout`  | Refresh cookie | `204`.                                                 |
| `GET`  | `/auth/me`      | Bearer         | `200`, usuario público.                                |

### 13.2 Dashboard

| Método | Ruta                 | Acceso     | Respuesta                                   |
| ------ | -------------------- | ---------- | ------------------------------------------- |
| `GET`  | `/dashboard/summary` | ADMIN/USER | `200`, `{ usuarios, productos, clientes }`. |

### 13.3 Usuarios

Solo `ADMIN`:

| Método   | Ruta            | Respuesta                          |
| -------- | --------------- | ---------------------------------- |
| `GET`    | `/usuarios`     | `200`, array público.              |
| `GET`    | `/usuarios/:id` | `200`, usuario público.            |
| `POST`   | `/usuarios`     | `201`, usuario creado como `USER`. |
| `PUT`    | `/usuarios/:id` | `200`, usuario actualizado.        |
| `DELETE` | `/usuarios/:id` | `204`.                             |

Create requiere password. Update permite password opcional. El body no acepta `role`.

### 13.4 Productos

ADMIN y USER:

| Método   | Ruta             | Contenido             | Respuesta                    |
| -------- | ---------------- | --------------------- | ---------------------------- |
| `GET`    | `/productos`     | —                     | `200`, array.                |
| `GET`    | `/productos/:id` | —                     | `200`, producto.             |
| `POST`   | `/productos`     | `multipart/form-data` | `201`, producto calculado.   |
| `PUT`    | `/productos/:id` | `multipart/form-data` | `200`, producto actualizado. |
| `DELETE` | `/productos/:id` | —                     | `204`.                       |

Create requiere `image`; update permite no enviarla.

### 13.5 Clientes

ADMIN y USER:

| Método   | Ruta            | Respuesta                               |
| -------- | --------------- | --------------------------------------- |
| `GET`    | `/clientes`     | `200`, array ordenado por razón social. |
| `GET`    | `/clientes/:id` | `200`, cliente.                         |
| `POST`   | `/clientes`     | `201`, cliente normalizado.             |
| `PUT`    | `/clientes/:id` | `200`, cliente actualizado.             |
| `DELETE` | `/clientes/:id` | `204`.                                  |

### 13.6 Rutas públicas fuera de `/api/v1`

| Método | Ruta                        | Uso                                    |
| ------ | --------------------------- | -------------------------------------- |
| `GET`  | `/health`                   | Confirma disponibilidad de la API.     |
| `GET`  | `/media/products/:filename` | Entrega una imagen validada.           |
| `GET`  | `/api/docs`                 | Swagger UI, si está habilitado.        |
| `GET`  | `/api/docs-json`            | Documento OpenAPI, si está habilitado. |

Los listados son arrays JSON directos y no tienen paginación en v1.

---

## 14. Backoffice web

### 14.1 Rutas frontend

| Ruta           | Acceso      | Función                     |
| -------------- | ----------- | --------------------------- |
| `/`            | Público     | Redirige a `/login`.        |
| `/login`       | Público     | Login y creación de sesión. |
| `/dashboard`   | ADMIN/USER  | Conteos reales.             |
| `/usuarios`    | ADMIN       | CRUD de usuarios.           |
| `/productos`   | ADMIN/USER  | CRUD, imagen e IVA.         |
| `/clientes`    | ADMIN/USER  | CRUD y normalización.       |
| `/403`         | Autenticado | Acceso restringido.         |
| cualquier otra | —           | Pantalla 404.               |

### 14.2 AuthContext

`AuthProvider` mantiene:

- Estado `CHECKING`, `AUTHENTICATED` o `UNAUTHENTICATED`.
- Usuario público actual.
- Access token solo en memoria.
- Login y logout.
- Intento inicial de refresh para recuperar una sesión existente.

El refresh token no se almacena en localStorage ni se expone al código de la aplicación porque vive en cookie HttpOnly.

### 14.3 Cliente HTTP

`apps/web/src/services/api-client.ts` centraliza:

- URL base configurable con `VITE_API_URL`.
- Header JSON cuando corresponde.
- Header Bearer si existe access token.
- `credentials: include` para enviar cookies.
- Lectura del sobre de error.
- Conversión a `ApiError`.
- Reintento único después de `401` mediante refresh.
- Coordinación de refresh concurrente.
- Tratamiento de respuestas `204` sin intentar parsear JSON.
- Resolución de URLs públicas de imágenes.

### 14.4 React Query

Cada mantenedor usa queries para listar y mutations para crear, actualizar y eliminar. Después de una mutación exitosa se invalidan las queries correspondientes para mostrar el estado persistido, no una copia local desactualizada.

### 14.5 Formularios y feedback

- Usuarios usa React Hook Form y Zod.
- Productos usa `FormData` para texto e imagen.
- Clientes usa campos controlados y muestra `fieldErrors` del backend.
- Los errores de red y API se muestran mediante `StatusBanner`.
- La validación de frontend mejora la experiencia, pero el backend vuelve a validar todo.

---

## 15. Swagger/OpenAPI

Swagger se configura en `apps/api/src/main.ts` mediante `@nestjs/swagger`.

URL de interfaz:

```text
http://localhost:3000/api/docs
```

JSON OpenAPI:

```text
http://localhost:3000/api/docs-json
```

La documentación muestra:

- Tags `Auth`, `Users`, `Products`, `Clients`, `Dashboard`, `Health` y `Media`.
- Esquema Bearer JWT.
- Rutas con prefijo `/api/v1`.
- Health y media fuera del prefijo global.
- DTOs de entrada y respuesta.
- Respuestas arrays para listados.
- Multipart de productos.
- Imagen binaria obligatoria en create.
- Imagen opcional en update.
- Campos calculados de producto en la respuesta.
- Ejemplos de RUT, correo, dinero, stocks y respuestas.

### Uso práctico de Swagger

1. Iniciar MySQL.
2. Aplicar migración y seed.
3. Iniciar API con `start:demo`.
4. Consultar `/health` y verificar `200`.
5. Abrir `/api/docs`.
6. Revisar tags y rutas.
7. Revisar `POST /api/v1/auth/login` sin exponer secretos.
8. Revisar `Authorize` y la seguridad Bearer.
9. Revisar `POST /api/v1/productos` como `multipart/form-data`.
10. Verificar `image` como archivo obligatorio.
11. Verificar la respuesta con `precioVenta` e `imageUrl`.

---

## 16. Seguridad HTTP

La API aplica globalmente:

- Helmet.
- CORS con orígenes explícitos y `credentials: true`.
- Body JSON máximo de 100 KiB.
- Multipart de imagen máximo de 5 MiB.
- Validación de firma real de imagen.
- Rate limiting global.
- `x-request-id` UUID para trazabilidad.
- `Cache-Control: no-store` en `/api/v1`.
- Cache público inmutable para imágenes.
- Cookie refresh HttpOnly y `SameSite=Lax`.
- Swagger controlable mediante `SWAGGER_ENABLED`.
- No logging de secretos.
- Respuestas públicas sin passwords, hashes, refresh tokens ni paths internos.

La configuración de producción debe añadir HTTPS, secretos reales fuera del repositorio y `SWAGGER_ENABLED=false` cuando la documentación no deba exponerse.

---

## 17. Ejecución local completa

### 17.1 Secuencia recomendada

Terminal 1 — MySQL:

```bash
docker compose up -d
docker compose ps
```

Terminal 2 — migración y seed:

```bash
corepack pnpm --filter @ventasfix/api db:migrate
corepack pnpm --filter @ventasfix/api db:seed
```

Terminal 3 — API:

```bash
corepack pnpm --filter @ventasfix/api start:demo
```

Terminal 4 — frontend:

```bash
corepack pnpm --filter @ventasfix/web dev
```

Abrir:

```text
http://localhost:5173
http://localhost:3000/health
http://localhost:3000/api/docs
```

### 17.2 Desarrollo con recompilación manual

```bash
corepack pnpm --filter @ventasfix/api build
corepack pnpm --filter @ventasfix/api start
```

`start:demo` ejecuta primero el build y luego inicia `dist/main.js`, por lo que es el comando recomendado para una demostración local. Si ya hay una API en el puerto 3000, detenerla antes.

### 17.3 Detener servicios

- API y frontend: `Ctrl+C` en sus terminales.
- MySQL sin borrar datos:

```bash
docker compose stop
```

- Eliminar contenedor y volumen de datos solo si se acepta perder la base local:

```bash
docker compose down -v
```

Este último comando es destructivo para los datos de MySQL.

---

## 18. Pruebas y quality gates

Desde la raíz:

```bash
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

### 18.1 Tests de API

```bash
corepack pnpm --filter @ventasfix/api test
```

Incluyen:

- Auth controller y service.
- Guards JWT y roles.
- Validación y errores.
- Integración de auth, usuarios, productos, clientes y dashboard.
- Contrato OpenAPI/Swagger.
- Persistencia contra la base de test.

Las suites de integración se ejecutan serialmente porque comparten `ventasfix_test`.

### 18.2 Tests frontend

```bash
corepack pnpm --filter @ventasfix/web test
corepack pnpm --filter @ventasfix/web typecheck
corepack pnpm --filter @ventasfix/web lint
corepack pnpm --filter @ventasfix/web build
```

Cubren rutas, contexto de autenticación, dashboard y comportamientos de clientes.

### 18.3 E2E Playwright

```bash
corepack pnpm --filter @ventasfix/web test:e2e
```

Playwright levanta o reutiliza:

- API en `http://127.0.0.1:3000`.
- Vite en `http://127.0.0.1:5173`.
- Migraciones y seed.
- Chrome instalado localmente.

Flujo ADMIN:

- Login.
- Dashboard.
- Usuarios.
- Creación de usuario.
- Productos e imagen.
- Clientes.
- Logout.

Flujo USER:

- Login.
- Dashboard.
- Sin navegación de Usuarios.
- Bloqueo de `/usuarios` por URL directa.
- Acceso a Productos y Clientes.
- Logout.

Los tests limpian los registros de prueba conocidos antes y después de ejecutarse.

### 18.4 Evidencia de verificación

La verificación registrada para el proyecto incluye:

- Format check.
- Lint.
- Typecheck.
- Tests API.
- Tests frontend.
- Build.
- E2E ADMIN/USER.
- Smoke de health, Swagger, login, dashboard y frontend.

Antes de una entrega final se deben repetir los comandos y conservar el resultado real de la ejecución. El README no sustituye la evidencia de terminal.

La revisión técnica del 2026-09-17 volvió a ejecutar los gates después de las correcciones de integridad. El resultado final queda respaldado por la salida real de los comandos y el commit de cierre.

---

## 20. Troubleshooting

### La API no arranca

Comprobar:

```bash
docker compose ps
```

Después revisar:

- `apps/api/.env` existe.
- `DATABASE_URL` usa puerto `3307`.
- `JWT_ACCESS_SECRET` tiene al menos 32 caracteres.
- No hay otra aplicación ocupando el puerto 3000.
- MySQL figura como `healthy`.

### Prisma devuelve error de conexión

- Iniciar Docker Desktop.
- Ejecutar `docker compose up -d`.
- Esperar el healthcheck.
- Confirmar usuario, password, host, puerto y nombre de base.
- No usar `localhost:3306` desde el host; el compose publica MySQL en `localhost:3307`.

### Swagger no aparece

Comprobar:

```env
SWAGGER_ENABLED=true
```

Reiniciar la API después de cambiar `.env` y abrir:

```text
http://localhost:3000/api/docs
```

Si `/health` funciona pero Swagger no, confirmar que la API fue recompilada y que se está ejecutando `start:demo`, no un `dist` antiguo.

### El frontend queda en “Comprobando sesión…”

- Confirmar que la API está activa.
- Confirmar `http://localhost:3000/health`.
- Confirmar `VITE_API_URL`.
- Confirmar que el origen web coincide con `WEB_ORIGIN`.
- Revisar la consola del navegador por errores CORS.

### El login falla después de cambiar el password

El seed no reemplaza el password de un administrador existente. Para una demo local limpia:

```bash
corepack pnpm --filter @ventasfix/api db:reset:demo
corepack pnpm --filter @ventasfix/api db:seed
```

Recordar que el reset elimina los datos de `ventasfix_dev`.

### Una imagen no carga

Comprobar:

- Archivo JPEG, PNG o WebP real.
- Tamaño menor o igual a 5 MiB.
- API activa.
- URL de imagen resuelta contra el origen de API.
- CORS permitido.
- Archivo ubicado en `media/products`.

### E2E no encuentra Chrome

Instalar Chrome o configurar el navegador disponible en el entorno local. La configuración no depende de una ruta absoluta del equipo del autor.

### El puerto 3000 o 5173 está ocupado

Detener el proceso anterior antes de ejecutar `start:demo` o Vite. El servidor de demo no debe ejecutarse dos veces en el mismo puerto.

---

## 21. Decisiones y límites del alcance

### Incluido

- Backoffice React.
- API NestJS.
- MySQL con Docker.
- Prisma y migraciones.
- Auth JWT y refresh cookie.
- RBAC ADMIN/USER.
- ADMIN único.
- CRUD de usuarios, productos y clientes.
- Dashboard.
- Imágenes de productos.
- Swagger/OpenAPI.
- Validaciones, normalización y errores.
- Tests unitarios, integración, frontend y E2E.

### Fuera de alcance de R0/R1–R11

- Integración real con Softland: no se entregaron SDK, endpoints, credenciales ni contrato verificable.
- Paginación v1.
- Endpoints PATCH.
- Detección de reutilización de familias completas de refresh tokens.
- Límite global de sesiones por usuario.
- Promoción automática de usuarios a ADMIN.
- Reproducción del template académico original cuando el enlace oficial está inaccesible.

El Backoffice propio corresponde a la contingencia documentada; no debe describirse como una copia del template original.

---

## 22. Entrega y exclusiones del paquete

El paquete final debe excluir:

- `node_modules`.
- `dist`.
- `.env`.
- Tokens y passwords.
- Media local temporal.
- Resultados temporales de pruebas.
- Archivos de trabajo no requeridos.

El paquete documentado es:

```text
EXF_MORALES_SEBASTIAN.zip
```

Al extraerlo, debe crear:

```text
EVAFINAL_DESARROLLOWEB_MORALES_COVARRUBIAS
```

La evidencia de template inaccesible está en:

```text
EVIDENCIA_TEMPLATE_INACCESIBLE.txt
```

El SDD actualizado se entrega como paquete separado en la ruta indicada en la sección 2.

---

## 23. Checklist final

### Instalación y operación

- [ ] Node.js compatible instalado.
- [ ] Corepack habilitado.
- [ ] Dependencias instaladas.
- [ ] `apps/api/.env` creado y excluido de Git.
- [ ] MySQL `healthy`.
- [ ] Migraciones aplicadas.
- [ ] Seed ejecutado.
- [ ] `/health` responde `200`.
- [ ] Frontend abre y la raíz redirige a `/login`.
- [ ] Swagger abre en `/api/docs`.

### Funcionalidad

- [ ] Login ADMIN.
- [ ] Dashboard con conteos.
- [ ] CRUD de usuarios.
- [ ] Protección del ADMIN único.
- [ ] CRUD de productos.
- [ ] IVA calculado server-side.
- [ ] Imagen create/update/delete.
- [ ] CRUD de clientes.
- [ ] RUT, teléfono y email normalizados.
- [ ] USER bloqueado de Usuarios por navegación y URL directa.
- [ ] Errores `400`, `403`, `409` y `422` comprobados.

### Calidad

- [ ] `format:check`.
- [ ] `lint`.
- [ ] `typecheck`.
- [ ] Tests API.
- [ ] Tests frontend.
- [ ] Build.
- [ ] E2E ADMIN.
- [ ] E2E USER.
- [ ] Sin errores rojos de consola.

## 24. Referencias del proyecto

- Código fuente: <https://github.com/SebastianM69/EVAFINAL_DESARROLLOWEB_MORALES_COVARRUBIAS>
- SDD vigente: paquete documental entregado por separado del repositorio.
- Evidencia del template: `EVIDENCIA_TEMPLATE_INACCESIBLE.txt`
