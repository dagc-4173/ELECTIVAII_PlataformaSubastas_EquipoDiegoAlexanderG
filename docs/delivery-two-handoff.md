# Entrega 2: revisión y sustentación

Fecha de revisión: 2 de noviembre de 2026. Rama candidata: `release/entrega-2`.

Integrante y equipo confirmados por el autor: **Diego Alexander Gutiérrez Cardona**. Fecha de entrega informada por el autor: **3 de noviembre de 2026**.

Esta rama acumula autenticación, documentación, perfil, consulta de orden, SQLite, WebSockets y validaciones HTTP. No constituye por sí sola la entrega académica ni una integración en `main`. La revisión final añadió una corrección RN-02 para impedir publicar subastas ya vencidas con fechas históricas proporcionadas por el cliente.

## Estado verificable

| Aspecto | Resultado | Evidencia |
|---|---|---|
| Usuarios | Registro, login JWT y perfil propio con actividad | `tests/infrastructure/http/authRoutes.test.ts`, `userProfile.test.ts` |
| Subastas y pujas | Publicación, filtros, detalle, cancelación autorizada, pujas y registro de rechazo | `tests/domain/entities/Auction.test.ts`, `tests/infrastructure/http/auctionAuthorization.test.ts` |
| Cierre y orden | Cierre perezoso, adjudicación, orden a 48 horas y consulta del ganador | `tests/infrastructure/http/paymentOrder.test.ts` |
| Persistencia | SQLite por puertos, recuperación del agregado y unicidad de usuarios | `tests/infrastructure/persistence/sqlite/SqliteRepositories.test.ts`, `npm run verify:persistence` |
| Tiempo real | Suscripción por subasta, nueva puja, aviso de superación y cierre | `tests/infrastructure/realtime/auctionRealtime.test.ts` |
| Independencia de eventos | Puerto de salida y publicación después de guardar | `tests/application/use-cases/AuctionEvents.test.ts` |
| Privacidad | Detalle autenticado sin datos privados de postores | Pruebas RN-23 en `auctionAuthorization.test.ts` |
| HTTP | Formato validado y errores JSON uniformes | `tests/infrastructure/http/inputValidation.test.ts` |
| Documentación | Instalación, contratos REST y WebSocket, decisiones de SQLite | README, OpenAPI y documentos enlazados al final |

Validación final de la implementación: 277 pruebas en 46 archivos; TypeScript, compilación, OpenAPI formal y recuperación SQLite entre dos procesos correctos. Instalación limpia comprobada con `npm ci`, verificación de tipos y recuperación entre procesos, sin `.env` ni base de desarrollo. Las importaciones revisadas del dominio y aplicación no dependen de Express, `ws`, SQLite ni infraestructura.

GitHub confirmó que el repositorio es público el día de la revisión. Las ramas publicadas de trabajo forman una cadena: no es necesario mezclar cada una individualmente si se integra la candidata que las contiene. La revisión final debe comparar `release/entrega-2` con la versión vigente de `main`.

## Reproducción desde cero

Usar Node 24.x >= 24.15.0. Clonar el repositorio y seleccionar `release/entrega-2` antes de instalar. En una instalación nueva:

```powershell
git clone https://github.com/dagc-4173/ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG.git
cd ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG
git switch release/entrega-2
npm ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Asignar el resultado a `JWT_SECRET` en `.env`, sin publicarlo. Conservar `DATABASE_PATH` entre reinicios. No sobrescribir un `.env` existente al actualizar una instalación.

```powershell
npm run typecheck
npm test
npm run verify:persistence
npm run build
npm start
```

OpenAPI se validó formalmente con `openapi-spec-validator` en el entorno de revisión; ese paquete Python no es una dependencia del backend ni se presupone instalado con npm. Para consumir REST, abrir `docs/openapi.yaml` en un visor compatible con OpenAPI 3.0.3.

## Guion de demostración

1. Explicar las capas y la dirección de dependencias: ruta/controlador → caso de uso → agregado; las dependencias externas se conectan por puertos.
2. Registrar vendedor y dos postores por `POST /users`; iniciar sesión con `POST /auth/login`. Mostrar `GET /users/me` y que la contraseña no aparece.
3. Publicar una subasta con fechas actuales y duración válida de al menos una hora. Mostrar filtros y detalle. La identidad del vendedor proviene del JWT.
4. Abrir dos terminales con los JWT de los dos postores y ejecutar `npm run watch:auction -- <auctionId>`. Esperar autenticación y acuse de suscripción.
5. Pujar por HTTP como primer postor. Ambos clientes reciben `BID_ACCEPTED`. Pujar con otro postor superando el incremento: ambos reciben la puja y solo el líder anterior recibe `BID_OUTBID`.
6. Mostrar rechazo de una puja baja, sin difusión de una nueva puja aceptada. Mostrar el historial del rechazo por REST. Mostrar que no puede cancelarse una subasta con pujas.
7. Para demostrar cierre sin esperar una hora, ejecutar la prueba WebSocket: usa un reloj simulado explícito y clientes de red reales, sin cambiar las reglas de duración del servidor.
8. Mostrar la prueba RF-17: adjudicación, orden, plazo, consulta del ganador y rechazo del vendedor/terceros. El cierre real continúa siendo perezoso y no ocurre solo por mantener una conexión WebSocket abierta.
9. Ejecutar la verificación de persistencia entre procesos: conserva usuarios, hashes, pujas, rechazos y orden. No se confunde con un simple repositorio en memoria.
10. Mostrar un cuerpo JSON inválido y una ruta desconocida, con sus errores JSON, y señalar el punto del código que separa formato de reglas de negocio.

```powershell
npm test -- tests/infrastructure/realtime/auctionRealtime.test.ts
npm test -- tests/infrastructure/http/paymentOrder.test.ts
npm run verify:persistence
```

## Preguntas de sustentación y puntos de código

| Pregunta | Punto para explicar |
|---|---|
| ¿Quién decide si una puja es válida? | `src/domain/entities/Auction.ts`, método `placeBid()`; RN-06 a RN-12 |
| ¿Quién autentica y de dónde sale el postor? | `authenticate.ts` y `AuctionController.placeBid()`; el JWT fija la identidad |
| ¿Quién anuncia novedades y cuándo? | `PlaceBidUseCase.ts`, después de `save()`; puerto `AuctionEventPublisher` |
| ¿Quién conoce WebSockets? | Solo el adaptador `WebSocketAuctionEventPublisher.ts` y la composición del servidor |
| ¿Qué ocurre si falla guardar o difundir? | No se publica antes de guardar; un fallo de difusión no deshace lo ya guardado. Los clientes reconcilian por REST |
| ¿Cómo se conserva la consistencia al recuperar? | Documento versionado, objetos de valor y `Auction.reconstitute()`; justificar esa fábrica añadida al dominio |
| ¿Cómo se evita sobrescribir una puja con un estado viejo? | Revisión comparada en SQLite; 409 exige recargar antes de decidir un reintento |
| ¿Quién consulta la orden? | `GetPaymentOrderUseCase.ts`: únicamente el ganador autenticado |
| ¿Qué no se ha implementado? | Webhook, confirmación externa y expiración automática; no afirmar lo contrario |

## Condiciones que requieren resolución antes de declarar entrega final

- Identificación académica completada en README con el nombre y equipo suministrados por el autor.
- Licencia ISC confirmada por el autor y archivo `LICENSE` añadido con copyright 2026 Diego Alexander Gutiérrez Cardona; coincide con `package.json`.
- El autor informó como fecha vigente el 3 de noviembre de 2026. Se conserva esta información como confirmación del autor, frente a la fecha anterior del PDF; no se atribuye una verificación independiente con el docente.
- R-04: limpieza de las diez ramas afectadas autorizada y aplicada. Se conservan autores, fechas, mensajes y estado final del proyecto; `main` no cambió. La verificación inicial detectó un residuo en `refs/pull/4/merge`; GitHub regeneró la referencia y la descarga posterior no encontró el valor en ninguna de las 20 referencias anunciadas. No se garantiza borrado de cachés ni copias externas. Véase [corrección del historial](history-cleanup.md).
- Revisar la adaptación de reconstitución respecto al criterio estricto de no modificar dominio al cambiar persistencia. El núcleo no importa tecnología y los casos de uso/puertos de repositorio permanecieron iguales durante ese cambio; la fábrica añadida está documentada.
- R-15 toma la versión en `main` antes del límite. Publicar una rama o abrir una propuesta de cambios no cumple por sí solo esa condición. La fusión requiere decisión explícita; esta preparación mantiene `main` intacta.

## Alcance diferido y límites conocidos

RF-16 (contador de participantes) y RF-18–20 (webhook) son opcionales en Entrega 2. RN-17 es parcial y RN-18/19 están pendientes. RN-20 existe en dominio, sin proceso automático de expiración. La aplicación web completa corresponde a Entrega 3. Los eventos WebSocket no tienen replay ni entrega garantizada. La ejecución soportada sigue siendo de un solo proceso.

El listado público incluye historiales sin datos de contacto; la protección JWT del detalle no implica exclusividad del historial. RN-23 se documenta con ese comportamiento y su prueba de privacidad. No hay integración con pasarela real ni despliegue de nube, y la guía no los exige.

## Documentos relacionados

- [README](../README.md)
- [Trazabilidad RN-01 a RN-23](business-rules-traceability.md)
- [OpenAPI REST](openapi.yaml)
- [API WebSocket y demostración de dos terminales](websocket-api.md)
- [Decisión SQLite](sqlite-persistence.md)
- [Revisión académica por avances](delivery-two-review.md)

## Revisión final del PR

La comprobación contra todo el diff de `main` corrigió tres detalles de formato. Se reprodujo por HTTP un defecto RN-02 (publicación vencida devolvía 201); se corrigió con validación de la hora del servidor dentro del dominio, coordinada por el caso de uso, y se agregaron pruebas HTTP y de frontera. La reconstitución de subastas históricas de SQLite se conserva. GitHub no reportó estados de CI para el commit consultado; la evidencia de validación es local. La fusión en `main` sigue requiriendo autorización del autor.
