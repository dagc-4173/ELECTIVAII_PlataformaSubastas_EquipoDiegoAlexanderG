# ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG

## Plataforma de Subastas en Línea

Proyecto académico desarrollado para la asignatura **Electiva II - Desarrollo** del programa de Ingeniería de Software.

La solución implementa una plataforma de subastas en línea siguiendo **Arquitectura Hexagonal**, con separación explícita entre dominio, aplicación e infraestructura.

## Información académica

- **Asignatura:** Electiva II - Desarrollo
- **Proyecto:** Plataforma de Subastas en Línea
- **Modalidad:** Individual
- **Repositorio:** `ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG`
- **Entrega actual:** Entrega 1 - Modelado del dominio y de los recursos de la API

---

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

Para esta entrega no se utiliza una base de datos real. La persistencia se realiza mediante adaptadores en memoria detrás de puertos.

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
- reglas de negocio RN-01 a RN-23;
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
- persistencia en memoria;
- generación concreta de identificadores;
- composición de dependencias.

### Seguridad

`ScryptPasswordHasher` implementa `PasswordHasher` mediante `scrypt` de `node:crypto`, con una sal aleatoria por contraseña. Rechaza contraseñas vacías y almacena la sal y el hash; la respuesta HTTP de registro no incluye ninguno de estos valores.

### Persistencia en memoria

Actualmente existen:

```text
InMemoryAuctionRepository
InMemoryUserRepository
```

Los datos se pierden al reiniciar el servidor y no se comparten entre procesos.

Estas clases implementan los puertos del dominio y permiten sustituir la persistencia en futuras entregas sin modificar el dominio ni los casos de uso.

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

- Node.js
- Express.js
- TypeScript
- Vitest
- npm

El proyecto usa TypeScript en modo estricto.

---

# Requisitos previos

Se requiere tener instalado:

- Node.js
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
```

Para desarrollo local puede crearse un archivo:

```text
.env
```

El servidor lee `process.env.PORT`, pero los scripts de npm no cargan `.env` automáticamente. Para usar ese archivo después de compilar:

```powershell
Copy-Item .env.example .env
npm run build
node --env-file=.env dist/server.js
```

También puede definirse la variable directamente en PowerShell:

```powershell
$env:PORT = "3001"
npm start
```

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

Cada reinicio vacía los repositorios en memoria.

En Windows, si PowerShell bloquea `npm.ps1`, utilizar `npm.cmd` en los comandos anteriores (por ejemplo, `npm.cmd run build`).

## Pruebas

```bash
npm test
```

Las pruebas utilizan Vitest.

---

# API REST

La API está diseñada alrededor de recursos. La URL base local es `http://localhost:3000`; las peticiones con cuerpo deben enviar `Content-Type: application/json`.

| Método | Ruta | Resultado exitoso |
|---|---|---|
| POST | `/users` | `201`: usuario registrado |
| POST | `/auctions` | `201`: subasta publicada |
| GET | `/auctions` | `200`: listado paginado |
| GET | `/auctions/{auctionId}` | `200`: detalle e historial |
| POST | `/auctions/{auctionId}/bids` | `201`: subasta con la puja aceptada |
| DELETE | `/auctions/{auctionId}` | `200`: subasta cancelada |

Los identificadores de usuarios, subastas, artículos, categorías, pujas e intentos rechazados se envían desde el cliente. Actualmente no hay autenticación ni comprobación de existencia del vendedor, postor, artículo o categoría al operar una subasta.

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

## Subastas

### Publicar una subasta

```http
POST /auctions
```

Ejemplo de cuerpo (ajustar las fechas al momento de la prueba para mantener la subasta abierta; la duración permitida es de 1 hora a 30 días):

```json
{
  "auctionId": "auction-001",
  "sellerId": "seller-001",
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

Permite filtros y paginación. `page` vale `1` y `pageSize` vale `10` por defecto; ambos deben ser enteros positivos. Los estados del dominio son `OPEN`, `CLOSED`, `CANCELLED`, `DESERTED` y `DEFAULTED`.

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
  "bidderId": "bidder-001",
  "amount": 100000,
  "placedAt": "2026-09-05T13:00:00.000Z",
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
404 Not Found
500 Internal Server Error
```

Una violación de una regla de negocio no devuelve un código HTTP de éxito.

---

# Cierre perezoso de subastas

El proyecto utiliza cierre perezoso.

No existe un proceso programado que cierre automáticamente las subastas.

Al consultar una subasta por ID, la aplicación compara el cierre con la hora del servidor. Al intentar pujar, compara el cierre con `placedAt`, enviado por el cliente. El listado `GET /auctions` no ejecuta el cierre perezoso.

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

Nota: la matriz todavía marca RN-22 como pendiente, aunque `RegisterUserUseCase` ya verifica la unicidad del correo y cuenta con pruebas.

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
- paginación.

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
```

## Infrastructure

Incluye pruebas del repositorio de subastas en memoria y de `ScryptPasswordHasher`. No hay actualmente pruebas HTTP de integración.

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
│   │   ├── security/
│   │   ├── app.ts
│   │   └── persistence/
│   │       └── memory/
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

# Estado actual de la Entrega 1

Actualmente se encuentra implementado:

- modelo de dominio;
- objetos de valor;
- agregado `Auction`;
- reglas principales de publicación y pujas;
- registro de intentos de puja rechazados;
- adjudicación;
- orden de pago dentro del dominio;
- puertos de persistencia;
- persistencia en memoria;
- casos de uso;
- cierre perezoso;
- registro de usuario con validación de correo único;
- filtros por categoría y estado;
- paginación;
- API REST de subastas y registro de usuarios;
- hash de contraseñas con `scrypt`;
- DTOs HTTP;
- manejo uniforme de errores;
- configuración del puerto mediante variable de entorno;
- pruebas unitarias;
- trazabilidad de reglas de negocio;
- documentación OpenAPI.

Algunas funcionalidades relacionadas con autenticación completa, notificaciones externas, procesamiento de eventos de pago y comunicación en tiempo real quedan reservadas para entregas posteriores según el alcance acumulativo del proyecto.

---

# Próximas entregas

## Entrega 2

La siguiente etapa ampliará la solución con los componentes definidos por el documento del proyecto, incluyendo funcionalidades de backend adicionales y comunicación en tiempo real.

## Entrega 3

La última entrega integrará el backend con la aplicación web.

---

# Autor

Proyecto académico desarrollado para:

**Electiva II - Desarrollo**  
**Ingeniería de Software**
