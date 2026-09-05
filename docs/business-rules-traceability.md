# Trazabilidad de Reglas de Negocio

## Plataforma de Subastas en Línea

**Asignatura:** Electiva II - Desarrollo  
**Proyecto:** Plataforma de Subastas en Línea  
**Repositorio:** `ELECTIVAII_PlataformaSubastas_EquipoDiegoAlexanderG`

Este documento relaciona las reglas de negocio RN-01 a RN-23 definidas en el documento oficial del proyecto con su implementación en el código fuente y las pruebas que demuestran su funcionamiento.

La finalidad de esta matriz es facilitar la revisión técnica y la sustentación del proyecto, permitiendo identificar con precisión dónde se implementa cada regla de negocio.

## Matriz de trazabilidad

| Regla | Descripción | Estado | Archivo principal | Clase / método responsable | Prueba que demuestra la regla |
|---|---|---|---|---|---|
| RN-01 | El precio base y el incremento mínimo deben ser mayores que cero y debe existir fecha/hora de cierre. | Implementada | `src/domain/value-objects/AuctionPublicationData.ts` | `AuctionPublicationData.create()` | `RN-01 should reject a base price equal to zero`; `RN-01 should reject a minimum increment equal to zero` |
| RN-02 | La fecha de cierre debe ser posterior a la fecha de publicación. | Implementada | `src/domain/value-objects/AuctionPublicationData.ts` | `AuctionPublicationData.create()` | `RN-02 should reject a closing date equal to the publication date`; `RN-02 should reject a closing date before the publication date` |
| RN-03 | La duración de una subasta debe estar entre 1 hora y 30 días calendario. | Implementada | `src/domain/value-objects/AuctionPublicationData.ts` | `AuctionPublicationData.create()` | `RN-03 should reject a duration shorter than one hour`; `RN-03 should allow a duration of exactly one hour`; `RN-03 should allow a duration of exactly thirty days`; `RN-03 should reject a duration longer than thirty days` |
| RN-04 | Una subasta solo puede cancelarse si no tiene pujas. | Implementada | `src/domain/entities/Auction.ts` | `Auction.cancel()` | `RN-04 should cancel an auction when it has no bids`; `RN-04 should reject cancellation when the auction already has bids`; `RN-04 should reject cancellation when the auction is no longer open` |
| RN-05 | Los datos de publicación de una subasta no pueden modificarse después de publicarse. | Implementada por diseño inmutable | `src/domain/entities/Auction.ts`, `src/domain/value-objects/AuctionPublicationData.ts` | Campos `readonly`, getters defensivos y ausencia de métodos de modificación | `should preserve publication data`; `should protect publication dates from external mutation` |
| RN-06 | Solo las subastas abiertas pueden aceptar pujas. | Implementada | `src/domain/entities/Auction.ts` | `Auction.placeBid()` | `RN-06 should accept a bid when the auction is open`; `RN-06 and RN-12 should reject and record a bid when the auction is not open`; `RN-06 and RN-12 should reject and record a bid at or after the auction closing date` |
| RN-07 | El vendedor no puede pujar en su propia subasta. | Implementada | `src/domain/entities/Auction.ts` | `Auction.placeBid()` | `RN-07 and RN-12 should reject and record a bid from the auction seller` |
| RN-08 | La primera puja debe ser mayor o igual al precio base. | Implementada | `src/domain/entities/Auction.ts` | `Auction.placeBid()` | `RN-08 should accept the first bid when it is equal to the base price`; `RN-08 and RN-12 should reject and record the first bid when it is below the base price` |
| RN-09 | Las pujas posteriores deben ser al menos la puja más alta actual más el incremento mínimo. | Implementada | `src/domain/entities/Auction.ts` | `Auction.placeBid()` | `RN-09 should accept a bid equal to the current highest bid plus minimum increment`; `RN-09 and RN-12 should reject and record a bid below the required minimum`; `RN-09 should reject a bid equal to the current highest bid` |
| RN-10 | El usuario con la puja más alta no puede superarse a sí mismo. | Implementada | `src/domain/entities/Auction.ts` | `Auction.placeBid()` | `RN-10 and RN-12 should reject and record a bid from the current highest bidder` |
| RN-11 | Una puja aceptada es irrevocable. | Implementada | `src/domain/entities/Auction.ts` | `Auction.placeBid()` y exposición de historial de solo lectura | `RN-11 should keep an accepted bid irrevocably in the auction history` |
| RN-12 | Todo intento de puja rechazado debe conservarse con su motivo. | Implementada | `src/domain/entities/Auction.ts` | `Auction.rejectBid()` | `RN-06 and RN-12 should reject and record a bid when the auction is not open`; `RN-07 and RN-12 should reject and record a bid from the auction seller`; `RN-08 and RN-12 should reject and record the first bid when it is below the base price`; `RN-09 and RN-12 should reject and record a bid below the required minimum`; `RN-10 and RN-12 should reject and record a bid from the current highest bidder` |
| RN-13 | Al cerrar una subasta con pujas, gana el usuario con la puja más alta. | Implementada | `src/domain/entities/Auction.ts` | `Auction.close()` y getter `winner` | `RN-13 should close the auction and assign the highest bidder as winner` |
| RN-14 | Una subasta cerrada sin pujas queda desierta y no genera orden de pago. | Implementada | `src/domain/entities/Auction.ts` | `Auction.close()` | `RN-14 should mark an auction without bids as deserted` |
| RN-15 | Al adjudicar una subasta se crea una orden de pago para el ganador, por el monto ganador y con vencimiento a 48 horas. | Implementada en dominio | `src/domain/entities/Auction.ts`, `src/domain/entities/PaymentOrder.ts` | `Auction.close()`, `PaymentOrder.create()` | `RN-15 should generate a payment order for the winning bid with a 48-hour deadline`; `should create a payment order for the winner and winning amount`; `should set the payment deadline to 48 hours after creation` |
| RN-16 | Una subasta solo puede cerrarse una vez. | Implementada | `src/domain/entities/Auction.ts` | `Auction.close()` | `RN-16 should reject closing the same auction more than once` |
| RN-17 | Una notificación externa únicamente puede confirmar el pago. | Parcial | `src/domain/entities/PaymentOrder.ts` | `PaymentOrder.confirm()` | `RN-17 should confirm a pending payment order`; `RN-17 should reject confirming a payment order more than once` |
| RN-18 | Una notificación de pago que no pueda verificarse debe rechazarse y no modificar el estado. | Pendiente | — | Requiere procesamiento/verificación de notificación externa | — |
| RN-19 | El procesamiento de eventos de pago debe ser idempotente. | Pendiente | — | Requiere caso de uso de procesamiento de `PaymentEvent` | — |
| RN-20 | Una orden de pago vencida y no confirmada debe quedar expirada y la subasta debe pasar a incumplida. | Implementada en dominio | `src/domain/entities/PaymentOrder.ts`, `src/domain/entities/Auction.ts` | `PaymentOrder.expire()`, `Auction.expirePayment()` | `RN-20 should expire a pending payment order at its due date`; `RN-20 should reject expiration before the payment deadline`; `RN-20 should reject expiration of a confirmed payment order`; `RN-20 should expire the payment order and mark the auction as defaulted` |
| RN-21 | Los valores monetarios se manejan como enteros, sin decimales y sin valores negativos. | Implementada | `src/domain/value-objects/Money.ts` | `Money.create()` | `should create money with a non-negative integer amount`; `should reject negative amounts`; `should reject decimal amounts` |
| RN-22 | El correo electrónico de un usuario debe ser único dentro de la plataforma. | Pendiente | — | Requiere `UserRepository.findByEmail()` y caso de uso de registro | — |
| RN-23 | El historial de pujas de una subasta es información pública para cualquier usuario registrado. Los datos de contacto de los postores no lo son. | Parcial | `src/domain/entities/Auction.ts`, `src/infrastructure/http/mappers/AuctionResponseMapper.ts` | `Auction.bidHistory`, `AuctionResponseMapper.toResponse()` | El historial se expone sin datos de contacto; queda pendiente restringir el acceso a usuarios autenticados/registrados |

## Reglas parcialmente implementadas

### RN-23

La representación HTTP del historial de pujas no expone información de contacto de los postores. Actualmente se identifica al pujador únicamente mediante `bidderId`.

La restricción de acceso exclusiva para usuarios registrados queda pendiente del mecanismo de autenticación de la API. No se implementa todavía para evitar adelantar innecesariamente RF-02 antes de cerrar el alcance principal de la Entrega 1.