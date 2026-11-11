# API WebSocket de subastas

## Conexión y autenticación

El servidor REST y WebSocket comparten puerto. URL local: `ws://localhost:3000/ws`; utilizar `wss://` cuando exista TLS. Biblioteca del servidor: `ws`. Los navegadores utilizan su API nativa `WebSocket`.

Abrir la conexión y enviar en los primeros cinco segundos:

```json
{"type":"AUTHENTICATE","accessToken":"JWT obtenido mediante POST /auth/login"}
```

El servidor verifica firma, expiración y existencia del usuario, y responde:

```json
{"type":"AUTHENTICATED","userId":"bidder-001"}
```

No se envía el token en la URL, ni se acepta una identidad de usuario elegida por el cliente. Para cambiar token o cuenta, desconectar y reconectar. La conexión se cierra con código 1008 al faltar autenticación o presentarse credenciales inválidas; el heartbeat también termina conexiones vencidas. Los mensajes dirigidos a un usuario se envían a sus conexiones autenticadas activas, aunque no estén suscritas a esa subasta. No incluyen correo, contraseña ni hash.

## Comandos

```json
{"type":"SUBSCRIBE","auctionId":"auction-001"}
```

Respuesta: `{"type":"SUBSCRIBED","auctionId":"auction-001"}`. La subasta debe existir; el usuario debe seguir registrado. Puede haber hasta 64 suscripciones por conexión. Repetir una suscripción no duplica los eventos. La suscripción no ejecuta cierre perezoso ni trae un estado inicial: después del acuse, consultar `GET /auctions/{auctionId}` con JWT y reconciliar esa respuesta con los eventos recibidos.

```json
{"type":"UNSUBSCRIBE","auctionId":"auction-001"}
```

Respuesta: `{"type":"UNSUBSCRIBED","auctionId":"auction-001"}`. Detiene los eventos generales de esa sala; los avisos personales siguen ligados a la identidad del usuario.

Las pujas se envían exclusivamente por `POST /auctions/{auctionId}/bids`. WebSocket no acepta operaciones de puja, publicación, cierre ni pago.

## Eventos

| Tipo | Destinatarios | Campos adicionales |
|---|---|---|
| `BID_ACCEPTED` | Todos los suscritos a la subasta, incluido quien pujó | `auctionId`, `bidId`, `bidderId`, `amount`, `placedAt` |
| `BID_OUTBID` | Conexiones autenticadas del líder anterior | `auctionId`, `recipientId`, `currentBidderId`, `amount` |
| `AUCTION_CLOSED` | Todos los suscritos | `auctionId`, `status` (`CLOSED` o `DESERTED`), `sellerId`, `winnerId`, `amount` |
| `AUCTION_RESULT` | Conexiones del vendedor y del ganador | Campos de cierre y `recipientId` |
| `PARTICIPANT_COUNT` | Todos los suscritos | `auctionId`, `count` de cuentas distintas |
| `PAYMENT_UPDATED` | Ganador suscrito al confirmar, todos los suscritos al vencer | `auctionId`. El ganador consulta el estado por REST. |

`winnerId` y `amount` son `null` si quedó desierta. Los montos son COP enteros y `placedAt` es una fecha ISO del servidor. No se publica el identificador de orden de pago en estos eventos: el ganador la consulta por la ruta protegida RF-17.

Ejemplo de puja aceptada:

```json
{"type":"BID_ACCEPTED","auctionId":"auction-001","bidId":"bid-001","bidderId":"bidder-001","amount":100000,"placedAt":"2026-11-02T14:00:00.000Z"}
```

## Errores y operación

Los errores de protocolo son mensajes `ERROR` con `error.code` y `error.message`, separados de los códigos HTTP de REST:

```json
{"type":"ERROR","error":{"code":"AUCTION_NOT_FOUND","message":"Auction not found"}}
```

Códigos: `AUTHENTICATION_REQUIRED`, `INVALID_TOKEN`, `ALREADY_AUTHENTICATED`, `INVALID_MESSAGE`, `AUCTION_NOT_FOUND`, `SUBSCRIPTION_LIMIT` e `INTERNAL_SERVER_ERROR`. Formatos inválidos no modifican el dominio. El canal acepta solo JSON en texto y limita el tamaño a 16 KiB. Se hace ping cada 30 segundos; clientes sin pong se terminan. Clientes con más de 1 MiB pendiente de envío se desconectan con 1013. La librería del cliente gestiona pong automáticamente.

La emisión ocurre desde los casos de uso después de guardar mediante `AuctionEventPublisher`, nunca por llamadas WebSocket en controladores. `PlaceBidUseCase` emite puja aceptada y superación; el cierre perezoso de `GetAuctionUseCase` y `PlaceBidUseCase`, y el cierre explícito de `CloseAuctionUseCase`, anuncian cierre. Una escritura fallida, conflicto 409 o puja rechazada no anuncia una puja aceptada. Si la puja tardía provoca cierre, se anuncia el cierre guardado aunque luego se rechace la puja.

Los eventos son transitorios: no hay cola persistente, replay, confirmación de recepción ni garantía de entrega cuando un cliente se desconecta. Un fallo de difusión no transforma una operación ya guardada en un error REST. Al reconectar, autenticarse, suscribirse y volver a consultar REST; no reintentar una puja solo porque no llegó su evento. El escenario soportado sigue siendo un único proceso.

## Demostración con dos terminales

1. Compilar e iniciar el servidor con `.env` configurado: `npm run build` y `npm start`.
2. Registrar vendedor y dos postores; iniciar sesión con cada cuenta. Publicar una subasta abierta con el JWT del vendedor.
3. En dos terminales independientes, asignar a `AUCTION_TOKEN` el JWT de cada postor y ejecutar:

```powershell
$env:AUCTION_TOKEN = "token-del-login-de-este-postor"
npm run watch:auction -- auction-001
```

4. Esperar `AUTHENTICATED` y `SUBSCRIBED` en ambas terminales. Enviar una puja aceptada por HTTP con el token del primer postor: ambos reciben `BID_ACCEPTED`.
5. Enviar una puja mayor con el token del segundo postor: ambos reciben `BID_ACCEPTED`; solo el primero recibe `BID_OUTBID`.
6. Al llegar la hora de cierre, el servidor difunde `AUCTION_CLOSED`. Las conexiones del ganador y vendedor reciben además `AUCTION_RESULT`.

El cliente usa `WEBSOCKET_URL` si está definido; de lo contrario usa localhost y `PORT` de `.env` (3000 por defecto). `AUCTION_TOKEN` y `WEBSOCKET_URL` son variables del cliente de demostración, no nuevas variables obligatorias del servidor. No guardar JWT reales en Git.

Prueba automatizada con dos clientes y SQLite aislado:

```bash
npm test -- tests/infrastructure/realtime/auctionRealtime.test.ts
```

El contador de participantes cambia al suscribirse, salir de la sala o desconectarse. Dos pestañas con la misma cuenta cuentan como un participante.
