# ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG

## Plataforma de Subastas en Línea

Proyecto académico desarrollado para la asignatura **Electiva II - Desarrollo** del programa de Ingeniería de Software.

La solución implementa una plataforma de subastas en línea siguiendo **Arquitectura Hexagonal**, con separación explícita entre dominio, aplicación e infraestructura.

## Información académica

- **Asignatura:** Electiva II - Desarrollo
- **Proyecto:** Plataforma de Subastas en Línea
- **Modalidad:** Individual
- **Equipo:** Diego Alexander Gutiérrez Cardona
- **Integrante:** Diego Alexander Gutiérrez Cardona
- **Fecha de entrega informada:** 3 de noviembre de 2026
- **Repositorio:** `ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG`
- **Entrega actual:** Entrega 2 - API completa y comunicación en tiempo real (en desarrollo)
- **Entrega 1:** Modelado del dominio y recursos de la API

---

## Candidata de Entrega 2

La rama `release/entrega-2` reúne la implementación de backend, SQLite, WebSockets y validaciones revisadas. Véase la [guía de revisión y sustentación](docs/delivery-two-handoff.md), con instalación, evidencias y condiciones académicas pendientes. Publicar esta candidata no implica haber integrado `main` ni haber entregado formalmente al docente.

## Alcance de la Entrega 1

La primera entrega se concentra en:

- configuración inicial del proyecto;
- Arquitectura Hexagonal;
- modelo de dominio;
- entidades;
- objetos de valor;
- agregado `Auction`;
- reglas de publicación;
- reglas de pujas;
- registro de intentos de puja rechazados;
- puertos de persistencia;
- persistencia en memoria;
- casos de uso;
- API REST;
- controladores;
- manejo uniforme de errores;
- pruebas unitarias;
- documentación técnica del repositorio.

En la Entrega 1 se utilizó persistencia en memoria detrás de puertos. La ejecución actual utiliza SQLite como persistencia real para la Entrega 2.

---

# Arquitectura

El proyecto utiliza **Arquitectura Hexagonal (Ports and Adapters)**.

La estructura principal se divide en:

```text
src/
├── domain/
├── application/
└── infrastructure/
```

La dirección de dependencias se mantiene hacia el núcleo:

```text
Infrastructure
      ↓
Application
      ↓
Domain
```

El dominio no depende de Express, bases de datos, WebSockets, ORM ni otras tecnologías de infraestructura.

## Domain

Ruta:

```text
src/domain/
```

Contiene el modelo y las reglas de negocio.

Responsabilidades principales:

- entidades;
- objetos de valor;
- agregado `Auction`;
- reglas de negocio implementadas según la matriz RN-01 a RN-23;
- puertos de persistencia relacionados directamente con el dominio.

### Entidades principales

```text
Auction
Bid
Category
Item
Notification
PaymentEvent
PaymentOrder
RejectedBidAttempt
User
```

### Objetos de valor

Entre los principales Value Objects se encuentran:

```text
AuctionId
AuctionPublicationData
AuctionStatus
BidId
CategoryId
Email
ItemId
Money
NotificationId
PaymentEventId
PaymentOrderId
PaymentOrderStatus
RejectedBidAttemptId
UserId
```

### Aggregate Root

`Auction` es la raíz principal del agregado de subastas.

El agregado controla operaciones como:

- publicación;
- cancelación;
- recepción de pujas;
- rechazo y registro de intentos inválidos;
- cierre;
- adjudicación;
- creación de orden de pago;
- expiración del pago.

Las reglas de negocio no se implementan en controladores ni rutas HTTP.

---

## Application

Ruta:

```text
src/application/
```

Contiene los casos de uso y puertos necesarios para coordinar las operaciones de la aplicación.

### Casos de uso actuales

```text
PublishAuctionUseCase
GetAuctionUseCase
ListAuctionsUseCase
CancelAuctionUseCase
PlaceBidUseCase
CloseAuctionUseCase
RegisterUserUseCase
LoginUserUseCase
GetUserProfileUseCase
GetPaymentOrderUseCase
```

Los casos de uso dependen de interfaces y no de implementaciones concretas.

Ejemplo:

```text
GetAuctionUseCase
      ↓
AuctionRepository
```

La implementación concreta del repositorio pertenece a infraestructura.

### Puertos de aplicación

```text
IdGenerator
PasswordHasher
TokenService
AuctionEventPublisher
```
`PasswordHasher` permite que el caso de uso de registro solicite el hash de una contraseña sin depender de una implementación concreta de seguridad.

`IdGenerator` permite generar identificadores sin acoplar los casos de uso a una implementación concreta.

---

## Infrastructure

Ruta:

```text
src/infrastructure/
```

Contiene los adaptadores técnicos.

Responsabilidades:

- Express;
- controladores HTTP;
- rutas REST;
- mappers de respuesta;
- manejo de errores;
- persistencia SQLite mediante adaptadores;
- generación concreta de identificadores;
- composición de dependencias.

### Seguridad

`ScryptPasswordHasher` implementa `PasswordHasher` mediante `scrypt` de `node:crypto`, con una sal aleatoria por contraseña. Rechaza contraseñas vacías y almacena la sal y el hash; la respuesta HTTP de registro no incluye ninguno de estos valores.

`JwtTokenService` implementa `TokenService`: firma y verifica JWT HS256, con sujeto de usuario, emisor, audiencia y expiración. El middleware verifica además que el usuario siga registrado.

`AuctionEventPublisher` anuncia pujas aceptadas, superación y cierre después de persistir. `WebSocketAuctionEventPublisher` traduce esos hechos a mensajes WebSocket sin acoplar los casos de uso a `ws`.

### Persistencia SQLite

El servidor utiliza `SqliteUserRepository` y `SqliteAuctionRepository`, que implementan los puertos existentes. Se guarda el agregado completo de subasta como un documento JSON versionado dentro de una fila SQLite: publicación, estado, pujas, intentos rechazados y orden de pago. Cada guardado es atómico. Los usuarios se almacenan en una tabla con índices únicos para identificador y correo normalizado; la contraseña se conserva solo como hash.

La base se crea al iniciar, por defecto en `./data/auctions.sqlite`. Las carpetas padre se crean automáticamente. Los datos sobreviven al reinicio; para recuperarlos hay que conservar el archivo y usar la misma ruta. El archivo y sus auxiliares quedan fuera de Git. `DATABASE_PATH=:memory:` se reserva para pruebas aisladas y no conserva datos.

Las lecturas reconstruyen entidades independientes. Un guardado con una versión obsoleta devuelve `409 CONCURRENT_MODIFICATION`, sin sobrescribir la versión vigente; el cliente debe recargar y decidir si reintenta. No se promete soporte para varios procesos. Los documentos inválidos o versiones futuras se rechazan explícitamente.

Los adaptadores en memoria se conservan para pruebas. Los casos de uso y sus puertos no cambiaron. Se añadió `Auction.reconstitute()` como fábrica de dominio sin dependencias de SQLite para recuperar el agregado y comprobar coherencia mediante sus reglas. Véase [decisión de persistencia](docs/sqlite-persistence.md), incluida esta adaptación respecto a la guía.

### Generación de identificadores

```text
RandomIdGenerator
```

Utiliza `randomUUID()` desde infraestructura e implementa el puerto:

```text
IdGenerator
```

---

# Tecnologías

El backend utiliza:

- Node.js 24.x, versión 24.15.0 o posterior
- Express.js
- ws (WebSockets)
- TypeScript
- Vitest
- npm

El proyecto usa TypeScript en modo estricto.

---

# Requisitos previos

Se requiere tener instalado:

- Node.js 24.x, versión 24.15.0 o posterior
- npm
- Git

Para verificar las versiones:

```bash
node --version
npm --version
git --version
```

---

# Instalación

Clonar el repositorio:

```bash
git clone https://github.com/dagc-4173/ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG.git
```

Ingresar al proyecto:

```bash
cd ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG
```

Instalar las dependencias del archivo de bloqueo:

```bash
npm ci
```

---

# Variables de entorno

La configuración dependiente del entorno se maneja mediante variables de entorno.

El archivo:

```text
.env.example
```

contiene las variables requeridas como referencia.

Actualmente:

```env
PORT=3000
JWT_SECRET=reemplazar-por-un-secreto-local-aleatorio-de-32-caracteres-o-mas
JWT_EXPIRES_IN_SECONDS=3600
DATABASE_PATH=./data/auctions.sqlite
```

Para desarrollo local puede crearse un archivo:

```text
.env
```

La aplicación carga `.env` automáticamente mediante `dotenv/config`. `PORT` es opcional (3000 por defecto); `JWT_SECRET` es obligatorio y debe tener al menos 32 caracteres. `JWT_EXPIRES_IN_SECONDS` es opcional (3600 por defecto) y debe ser un entero positivo seguro. Una configuración JWT inválida impide iniciar el servidor.

```powershell
Copy-Item .env.example .env
# Editar .env y asignar un secreto local aleatorio antes de iniciar.
npm run build
npm start
```

Puede generar un secreto con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Las variables ya definidas en el entorno tienen prioridad sobre `.env`. `DATABASE_PATH` es opcional y vale `./data/auctions.sqlite` por defecto; una ruta relativa se resuelve desde el directorio de inicio de Node. Mantener la misma ruta al reiniciar. Una ruta vacía o sin permisos de escritura impide iniciar el servidor.

No deben almacenarse credenciales reales dentro del repositorio.

---

# Scripts disponibles

## Verificación de tipos

```bash
npm run typecheck
```

Ejecuta:

```text
tsc --noEmit
```

y comprueba que el proyecto cumple las reglas de TypeScript sin generar archivos compilados.

## Compilación

```bash
npm run build
```

Genera el código JavaScript dentro de:

```text
dist/
```

## Ejecución

Compilar antes de iniciar el servidor, también después de modificar el código:

```bash
npm run build
npm start
```

Por defecto el servidor se ejecuta en:

```text
http://localhost:3000
```

si no se define otra variable `PORT`.

## Desarrollo con recarga

Ejecutar `npm run build` una vez y abrir dos terminales en la carpeta del proyecto:

```bash
# Terminal 1: recompila al guardar cambios
npm run dev:build
```

```bash
# Terminal 2: reinicia el servidor cuando cambia dist/
npm run dev:server
```

Los reinicios conservan los datos en el archivo SQLite configurado. Las pruebas usan bases temporales o `:memory:` y no escriben en la base de desarrollo.

En Windows, si PowerShell bloquea `npm.ps1`, utilizar `npm.cmd` en los comandos anteriores (por ejemplo, `npm.cmd run build`).

## Pruebas

```bash
npm test
```

Las pruebas utilizan Vitest. Para verificar además la recuperación entre dos procesos Node independientes:

```bash
npm run verify:persistence
```

Este comando compila, crea una base temporal, guarda usuarios y una subasta adjudicada en un proceso, y verifica login, perfil, historial y orden desde otro proceso. Elimina únicamente su base temporal al finalizar.

---

# API REST

La API está diseñada alrededor de recursos. La URL base local es `http://localhost:3000`; las peticiones con cuerpo deben enviar `Content-Type: application/json`. El límite del cuerpo JSON es 100 KiB.

| Método | Ruta | Acceso | Resultado exitoso |
|---|---|---|---|
| POST | `/users` | Público | `201`: usuario registrado |
| GET | `/users/me` | JWT | `200`: perfil y actividad propia |
| POST | `/auth/login` | Público | `200`: token JWT |
| POST | `/auctions` | JWT | `201`: subasta publicada |
| GET | `/auctions` | Público | `200`: listado paginado |
| GET | `/auctions/{auctionId}` | JWT | `200`: detalle e historial |
| POST | `/auctions/{auctionId}/bids` | JWT | `201`: subasta con la puja aceptada |
| DELETE | `/auctions/{auctionId}` | JWT del vendedor | `200`: subasta cancelada |
| GET | `/auctions/{auctionId}/payment-order` | JWT del ganador | `200`: orden de pago |

Las operaciones protegidas requieren `Authorization: Bearer <accessToken>`. El vendedor y el postor se obtienen del JWT; la hora de la puja la fija el servidor. Los identificadores de usuario al registrar, subasta, artículo, categoría, puja e intento rechazado se proporcionan desde el cliente. No se comprueba la existencia de artículos ni categorías.

El listado público usa el mismo mapper que el detalle: incluye `bids` y `rejectedBidAttempts`, con identificadores de postores y sin datos de contacto. La protección del detalle no implica que el historial solo esté disponible mediante esa ruta; RN-23 cuenta con una prueba HTTP integral del detalle; la política del listado público se registra en la revisión académica.

## Usuarios

### Registrar un usuario

```http
POST /users
```

```json
{
  "userId": "seller-001",
  "name": "Diego",
  "email": "diego@example.com",
  "password": "clave-de-ejemplo"
}
```

Respuesta `201 Created`:

```json
{
  "id": "seller-001",
  "name": "Diego",
  "email": "diego@example.com"
}
```

Un correo ya registrado produce `400` con código `BUSINESS_RULE_VIOLATION` y mensaje `Email is already registered`. El registro no inicia una sesión ni devuelve un token.

### Consultar el perfil propio (RF-03)

```http
GET /users/me
Authorization: Bearer <accessToken>
```

Devuelve `id`, `name`, `email`, `publishedAuctions` y `participatedAuctions`. Las dos listas usan el esquema `AuctionResponse` de OpenAPI. La participación corresponde a tener al menos una puja aceptada; los intentos rechazados por sí solos no cuentan. Cada subasta aparece una sola vez en cada lista. Un usuario puede tener ambas listas con contenido.

La identidad se obtiene exclusivamente del JWT. No se aceptan identificadores para consultar perfiles ajenos, ni se devuelven contraseñas o hashes. Sin token válido devuelve `401`. Un perfil sin actividad devuelve ambas listas vacías. Esta consulta no tiene paginación ni ejecuta cierre perezoso; consultar el detalle de la subasta para actualizar su cierre.

## Autenticación

Tras registrar el usuario, iniciar sesión:

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "diego@example.com",
  "password": "clave-de-ejemplo"
}
```

Respuesta `200`: `accessToken` (JWT), `tokenType` (`Bearer`) y `expiresIn` (segundos). Usar el token en cada petición protegida. No hay endpoint de renovación ni cierre de sesión. Para pujar, registrar otro usuario e iniciar sesión con sus credenciales; el vendedor no puede pujar en su propia subasta.

## Subastas

### Publicar una subasta

```http
POST /auctions
```

Ejemplo de cuerpo (ajustar las fechas al momento de la prueba para mantener la subasta abierta; la duración permitida es de 1 hora a 30 días):

```json
{
  "auctionId": "auction-001",
  "itemId": "item-001",
  "categoryId": "category-001",
  "basePrice": 100000,
  "minimumIncrement": 5000,
  "publishedAt": "2026-09-05T12:00:00.000Z",
  "closesAt": "2026-09-06T12:00:00.000Z"
}
```

Respuesta exitosa:

```text
201 Created
```

---

### Listar subastas

```http
GET /auctions
```

Permite filtros y paginación. `page` vale `1` y `pageSize` vale `10` por defecto; ambos deben enviarse como dígitos decimales de enteros positivos seguros, sin ceros iniciales, valores repetidos, fracciones ni notación exponencial. El desplazamiento de paginación también debe ser un entero seguro. Los estados del dominio son `OPEN`, `CLOSED`, `CANCELLED`, `DESERTED` y `DEFAULTED`.

Parámetros disponibles:

```text
categoryId
status
page
pageSize
```

Ejemplo:

```http
GET /auctions?categoryId=category-001&status=OPEN&page=1&pageSize=10
```

Respuesta:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

---

### Consultar una subasta

```http
GET /auctions/{auctionId}
```

Ejemplo:

```http
GET /auctions/auction-001
```

---

### Registrar una puja

```http
POST /auctions/{auctionId}/bids
```

Ejemplo:

```json
{
  "bidId": "bid-001",
  "amount": 100000,
  "rejectedBidAttemptId": "rejected-attempt-001"
}
```

---

### Cancelar una subasta

```http
DELETE /auctions/{auctionId}
```

La operación cambia el estado a `CANCELLED`; no elimina el recurso. Devuelve la representación de la subasta y puede ser rechazada por las reglas de negocio.

Por ejemplo, RN-04 impide cancelar una subasta que ya tenga pujas.

---

## Consultar la orden de pago (RF-17)

```http
GET /auctions/{auctionId}/payment-order
Authorization: Bearer <accessToken>
```

Tras el cierre y la adjudicación, el ganador puede consultar `id`, `auctionId`, `winnerId`, `amount` (COP enteros), `status`, `createdAt` y `dueAt`. El plazo de la orden es de 48 horas desde su creación. Su estado inicial es `PENDING`.

La identidad proviene del JWT. Devuelve `401` sin autenticación válida, `403` si existe la orden pero el usuario no es el ganador (incluido el vendedor), y `404` con `RESOURCE_NOT_FOUND` si la subasta o la orden no existen. Las subastas abiertas o desiertas no tienen orden consultable.

Esta ruta solo lee: no ejecuta cierre perezoso, confirmación ni expiración. Para provocar el cierre de una subasta vencida, consultar primero `GET /auctions/{auctionId}`. Las lecturas repetidas conservan la misma orden; los estados `CONFIRMED` y `EXPIRED` están modelados en el dominio, sin procesos HTTP automáticos que los apliquen actualmente.

---

# Formato de errores

La API utiliza un formato uniforme:

```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Auction with bids cannot be cancelled"
  }
}
```

Ejemplo para una subasta inexistente al pujar o cancelar:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Auction not found"
  }
}
```

---

# Códigos HTTP

En la consulta `GET /auctions/{auctionId}`, una subasta inexistente devuelve `404` con código `AUCTION_NOT_FOUND` y mensaje `Auction not found`.

Entre los principales códigos utilizados se encuentran:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

| HTTP | Código | Situación |
|---|---|---|
| 400 | `INVALID_REQUEST` | Campos requeridos, tipos, fechas, identificadores o consulta inválidos |
| 400 | `INVALID_JSON` | JSON malformado o valor primitivo rechazado por el parser |
| 400 | `BUSINESS_RULE_VIOLATION` | Regla de negocio incumplida, incluido correo duplicado |
| 401 | `INVALID_CREDENTIALS` | Credenciales incorrectas |
| 401 | `AUTHENTICATION_REQUIRED` | Falta encabezado de autenticación |
| 401 | `INVALID_TOKEN` | Token inválido, vencido o usuario inexistente |
| 403 | `FORBIDDEN_OPERATION` | Cancelación por otro usuario o consulta de orden por alguien distinto del ganador |
| 404 | `AUCTION_NOT_FOUND` | Detalle inexistente |
| 404 | `RESOURCE_NOT_FOUND` | Subasta inexistente al pujar/cancelar o al consultar su orden; orden o usuario inexistente |
| 404 | `ROUTE_NOT_FOUND` | Ruta u operación HTTP no implementada |
| 409 | `CONCURRENT_MODIFICATION` | Otra operación guardó la subasta; recargar antes de reintentar |
| 413 | `PAYLOAD_TOO_LARGE` | Cuerpo JSON mayor de 100 KiB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Tipo de contenido, charset o codificación no admitidos |
| 500 | `INTERNAL_SERVER_ERROR` | Error inesperado |

Los middlewares HTTP comprueban objetos JSON, campos requeridos y tipos, fechas ISO reales con segundos y zona (`Z` o desplazamiento), parámetros de ruta y filtros/paginación. Las fechas imposibles, como 30 de febrero, se rechazan. Los campos adicionales que no se consumen se ignoran; en particular, `sellerId`, `bidderId` y `placedAt` no reemplazan la identidad ni la hora del servidor.

Las restricciones económicas siguen en el dominio: por ejemplo, un precio numérico igual a cero devuelve `BUSINESS_RULE_VIOLATION`. Una petición que ni siquiera representa una puja válida por formato se rechaza antes de llegar al dominio y no se registra como intento de puja. Un rechazo por reglas de la subasta conserva su comportamiento de registro.

La autenticación precede a la validación de campos en las rutas protegidas. El parser JSON global corre antes de las rutas: JSON malformado, cuerpos excesivos o codificación inválida pueden devolver 400/413/415 antes de comprobar el token. Los errores inesperados siguen devolviendo `500` sin exponer detalles internos.

---

# Comunicación en tiempo real (RF-12–15)

El servidor expone `ws://localhost:3000/ws` en el mismo puerto de REST. El cliente se autentica con JWT por mensaje, se suscribe a una subasta y recibe pujas aceptadas, avisos personales de superación y cierre/adjudicación. Las pujas siguen viajando por HTTP.

El contrato de mensajes, errores, límites, reconexión y la demostración con dos terminales están en [API WebSocket](docs/websocket-api.md). Para observar una subasta con un token de login:

```powershell
$env:AUCTION_TOKEN = "token-del-login"
npm run watch:auction -- auction-001
```

Los eventos se emiten después de guardar. No tienen replay ni entrega garantizada: al reconectar, volver a suscribirse y consultar el detalle REST. El contador de participantes (RF-16) es opcional y sigue pendiente.

---

# Cierre perezoso de subastas

El proyecto utiliza cierre perezoso.

No existe un proceso programado que cierre automáticamente las subastas.

Al consultar una subasta por ID, la aplicación compara el cierre con la hora del servidor. Al intentar pujar por HTTP, compara el cierre con la hora del servidor, que también fija `placedAt`. El listado `GET /auctions` no ejecuta el cierre perezoso.

`CloseAuctionUseCase` existe, pero no tiene una ruta HTTP propia. La expiración de pagos está modelada en el dominio y no se ejecuta automáticamente ni dispone de endpoint.

Si ya venció:

```text
Consulta / intento de puja
          ↓
GetAuctionUseCase / PlaceBidUseCase
          ↓
Auction.close()
          ↓
persistencia
```

Si existen pujas, la aplicación genera automáticamente un `PaymentOrderId` mediante el puerto:

```text
IdGenerator
```

cuya implementación actual es:

```text
RandomIdGenerator
```

---

# Reglas de negocio

La trazabilidad completa de RN-01 a RN-23 se encuentra en:

```text
docs/business-rules-traceability.md
```

RN-22 está implementada y probada. RN-17 es parcial; RN-18 y RN-19 están pendientes. RN-23 cuenta con pruebas HTTP del acceso autenticado al detalle y de ausencia de datos privados.

Este documento permite identificar para cada regla:

- archivo donde se implementa;
- clase o método responsable;
- estado de implementación;
- prueba que demuestra su funcionamiento.

Ejemplo:

```text
RN-09
→ src/domain/entities/Auction.ts
→ Auction.placeBid()
→ Auction.test.ts
```

---

# Documentación OpenAPI

La especificación de la API se encuentra en:

```text
docs/openapi.yaml
```

Incluye:

- endpoints;
- parámetros;
- cuerpos de petición;
- respuestas;
- esquemas;
- errores HTTP;
- filtros;
- paginación;
- autenticación JWT y requisitos `BearerAuth`.

OpenAPI describe REST. El canal WebSocket se documenta por separado en `docs/websocket-api.md`.

---

# Pruebas

Las pruebas están organizadas por capa:

```text
tests/
├── application/
├── domain/
└── infrastructure/
```

## Domain

Contiene pruebas sobre:

- entidades;
- objetos de valor;
- reglas de publicación;
- pujas;
- intentos rechazados;
- adjudicación;
- órdenes de pago;
- expiración.

## Application

Contiene pruebas de casos de uso como:

```text
PublishAuctionUseCase
GetAuctionUseCase
ListAuctionsUseCase
CancelAuctionUseCase
PlaceBidUseCase
CloseAuctionUseCase
RegisterUserUseCase
LoginUserUseCase
GetUserProfileUseCase
GetPaymentOrderUseCase
```

## Infrastructure

Incluye pruebas de repositorios en memoria y SQLite (recuperación, estados completos, unicidad y conflictos de escritura), `ScryptPasswordHasher`, `JwtTokenService` y pruebas HTTP con Supertest para login, autenticación, autorización y clasificación de errores. La prueba integral de RN-23 verifica acceso al detalle por un usuario registrado ajeno a la puja, ausencia de datos privados y rechazo de acceso anónimo al detalle.

Las pruebas están diseñadas para demostrar reglas de negocio y comportamiento funcional, no únicamente para aumentar cobertura.

---

# Estrategia Git

El desarrollo se realiza mediante ramas.

Convenciones utilizadas:

```text
feature/*
fix/*
test/*
docs/*
refactor/*
chore/*
```

La rama:

```text
main
```

debe mantenerse estable y ejecutable.

---

# Conventional Commits

Los commits utilizan la convención Conventional Commits.

Ejemplos:

```text
feat: add auction filters and pagination
feat: implement lazy auction closing
fix: preserve auction winner after payment default
test: add auction business rule tests
docs: document business rule traceability
chore: configure server port from environment
```

Se evitan mensajes genéricos como:

```text
cambios
actualización
arreglo
final
```

---

# Estructura general

```text
.
├── docs/
│   ├── websocket-api.md
│   ├── business-rules-traceability.md
│   └── openapi.yaml
│
├── src/
│   ├── application/
│   │   ├── errors/
│   │   ├── ports/
│   │   └── use-cases/
│   │
│   ├── domain/
│   │   ├── entities/
│   │   ├── ports/
│   │   └── value-objects/
│   │
│   ├── infrastructure/
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   ├── errors/
│   │   │   ├── mappers/
│   │   │   ├── middlewares/
│   │   │   └── routes/
│   │   ├── id/
│   │   ├── realtime/
│   │   ├── security/
│   │   ├── createApp.ts
│   │   ├── app.ts
│   │   └── persistence/
│   │       ├── memory/
│   │       └── sqlite/
│   │
│   └── server.ts
│
├── tests/
│   ├── application/
│   ├── domain/
│   └── infrastructure/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

# Estado actual de la Entrega 2 (en desarrollo)

Actualmente se encuentra implementado:

- modelo de dominio;
- objetos de valor;
- agregado `Auction`;
- reglas principales de publicación y pujas;
- registro de intentos de puja rechazados;
- adjudicación;
- orden de pago dentro del dominio y consulta protegida para el ganador (RF-17);
- puertos de persistencia;
- persistencia SQLite mediante adaptadores;
- casos de uso;
- cierre perezoso;
- registro de usuario con validación de correo único;
- perfil autenticado con subastas publicadas y participadas (RF-03);
- filtros por categoría y estado;
- paginación;
- API REST de subastas, registro y login de usuarios;
- autenticación JWT y autorización para cancelar y pujar;
- hash de contraseñas con `scrypt`;
- WebSockets con suscripciones por subasta y avisos de puja, superación y cierre;
- puerto de salida de eventos desacoplado de la biblioteca WebSocket;
- DTOs HTTP;
- manejo uniforme de errores;
- configuración de puerto y JWT mediante variables de entorno;
- pruebas unitarias;
- trazabilidad de reglas de negocio;
- documentación OpenAPI.

Siguen pendientes las notificaciones externas, la verificación y el procesamiento idempotente de eventos de pago (RN-17 parcial; RN-18 y RN-19 pendientes). WebSockets (RF-12–15) y la persistencia real SQLite ya están implementados. Las validaciones HTTP y los errores uniformes ya están revisados. Falta completar las condiciones académicas y preparar la entrega. No se declara completa la Entrega 2.

---

# Próximas entregas

## Entrega 2

La etapa actual debe completar la solución con los componentes definidos por el documento del proyecto, incluyendo funcionalidades de backend adicionales y comunicación en tiempo real.

## Entrega 3

La última entrega integrará el backend con la aplicación web.

---

# Autor

Proyecto académico desarrollado por **Diego Alexander Gutiérrez Cardona** para:

**Electiva II - Desarrollo**  
**Ingeniería de Software**

## Referencia académica y revisión de fase 2.16

Se revisaron `Proyecto Subastas Electiva II.pdf` (apartados 5, 6 y 9) y `Guía para la Entrega de Proyectos con GITHUB.pdf`. La persistencia real y WebSockets son obligatorios para la Entrega 2; el webhook es opcional en esta entrega y debe estar terminado en la Entrega 3. Véase [revisión y orden de trabajo](docs/delivery-two-review.md).

## Licencia

`package.json` declara la licencia ISC. La revisión de entrega debe confirmar esta elección y añadir el texto de licencia que corresponda antes de la distribución final.
