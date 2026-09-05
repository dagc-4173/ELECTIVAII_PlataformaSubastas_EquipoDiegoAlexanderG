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
```

Este puerto permite generar identificadores sin acoplar los casos de uso a una implementación concreta.

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

### Persistencia en memoria

Actualmente existen:

```text
InMemoryAuctionRepository
InMemoryUserRepository
```

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

Instalar dependencias:

```bash
npm install
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

```bash
npm start
```

Por defecto el servidor se ejecuta en:

```text
http://localhost:3000
```

si no se define otra variable `PORT`.

## Pruebas

```bash
npm test
```

Las pruebas utilizan Vitest.

---

# API REST

La API está diseñada alrededor de recursos.

## Subastas

### Publicar una subasta

```http
POST /auctions
```

Ejemplo de cuerpo:

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

Permite filtros y paginación.

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

La operación puede ser rechazada por las reglas de negocio.

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

Ejemplo para recursos inexistentes:

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

Entre los principales códigos utilizados se encuentran:

```text
200 OK
201 Created
400 Bad Request
404 Not Found
```

Una violación de una regla de negocio no devuelve un código HTTP de éxito.

---

# Cierre perezoso de subastas

El proyecto utiliza cierre perezoso.

No existe un proceso programado que cierre automáticamente las subastas.

Cuando una subasta es consultada o recibe un intento de puja, la aplicación verifica si alcanzó su fecha de cierre.

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

Incluye pruebas de los adaptadores de persistencia en memoria.

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
- API REST de subastas;
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