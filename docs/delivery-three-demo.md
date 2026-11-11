# Sustentación de la Entrega 3

La demostración recorre la publicación, las pujas desde dos cuentas, el cierre, la adjudicación y la confirmación del pago mediante el simulador local.

## Arranque desde cero en Windows

Usar Node.js 24.x (24.15.0 o superior), npm y Git. Desde la raíz del repositorio, ejecutar:

```powershell
npm ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Usar `Copy-Item` en una copia nueva. Si ya existe `.env`, conservarlo y completar las variables que falten. Guardar el primer valor generado como `JWT_SECRET` y el segundo como `PAYMENT_WEBHOOK_SECRET` en `.env`.

```powershell
npm run typecheck
npm test
npm run verify:persistence
npm start
```

`verify:persistence` compila el proyecto y comprueba la recuperación de datos en dos procesos. Para arrancar sin esa comprobación, ejecutar `npm run build` antes de `npm start`. Dejar el servidor abierto y entrar a [http://localhost:3000/web/](http://localhost:3000/web/). SQLite crea la base en la ruta configurada en `DATABASE_PATH`.

## Demostración con tres cuentas

1. Crear una cuenta vendedora y dos cuentas postoras. Usar ventanas o perfiles de navegador separados y comprobar el correo de cada sesión en **Mi perfil**. Recargar una ventana para mostrar que conserva la sesión.
2. Como vendedor, abrir **Ver subastas → Publicar subasta**. Usar, por ejemplo, COP 100.000 de precio base y COP 5.000 de incremento. Preparar el cierre con anticipación, porque la duración mínima es de una hora.
3. Abrir la misma subasta en las tres ventanas y comprobar el indicador **En vivo**. Desde el primer postor, ofrecer COP 100.000. El vendedor y el segundo postor deben ver el nuevo monto y la puja sin recargar.
4. Desde el segundo postor, enviar COP 102.000. Mostrar el motivo del rechazo y corregir a COP 105.000. El primer postor debe recibir el aviso de que lo superaron.
5. Dejar el detalle abierto hasta la hora de cierre. Las vistas deben mostrar **Cerrada** y el ganador debe ver **Orden de pago** con el monto, la fecha límite y el identificador. Si el detalle estaba cerrado, volver a abrirlo para activar la comprobación del vencimiento.
6. Copiar el identificador de la orden ganadora. En otra terminal, desde la raíz del repositorio, ejecutar el comando siguiente, reemplazando el identificador de ejemplo por el que muestra el detalle.

```powershell
node scripts/simulate-payment.mjs "identificador-de-la-orden" SUCCESS
```

7. Mostrar las dos respuestas HTTP 200 idénticas con `outcome: "CONFIRMED"`. En la ventana ganadora, pulsar **Actualizar estado del pago** y comprobar que la fila **Estado** muestra **Confirmada**.

## Verificación sin esperar el cierre

Si no hay una subasta preparada para cerrarse durante la presentación, las pruebas de integración usan un reloj controlado y bases temporales:

```powershell
npm test -- tests/infrastructure/realtime/auctionRealtime.test.ts tests/infrastructure/http/paymentWebhook.test.ts
```

Las pruebas cubren la difusión del cierre, la verificación de firma, el reenvío del mismo evento y el vencimiento sin notificación. El simulador demuestra el pago en el entorno académico local.

## Archivos para explicar durante la sustentación

- [Trazabilidad de las reglas de negocio](business-rules-traceability.md)
- [Contrato REST](openapi.yaml)
- [Contrato WebSocket](websocket-api.md)
- [Persistencia SQLite](sqlite-persistence.md)
