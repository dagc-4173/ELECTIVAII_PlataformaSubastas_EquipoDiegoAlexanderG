# Decisión: persistencia local SQLite

## Contexto y elección

La Entrega 2 exige almacenamiento real, ejecución local y separación por puertos. Se utiliza SQLite en archivo con `node:sqlite`, disponible en la versión Node 24.15.0 usada para las validaciones. No se agrega ORM, servidor externo ni dependencia npm. Se exige Node 24.x >= 24.15.0. Referencia técnica: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html.

## Almacenamiento y reconstrucción

`users` guarda identificador, nombre, correo normalizado único y hash de contraseña. No guarda contraseñas en texto plano. `auctions` guarda un documento JSON versionado por agregado y una revisión numérica. Un documento contiene publicación, pujas ordenadas, rechazos con sus motivos y fechas, estado y orden con identificador, ganador, monto y estado. Un único INSERT/UPDATE SQLite guarda todo el agregado atómicamente; no existe escritura parcial del historial.

El esquema inicial se crea en una transacción y utiliza `PRAGMA user_version=1`. Una versión superior se rechaza; no se borra ni reinicializa silenciosamente una base existente. No se soportan migraciones de versiones futuras todavía.

La reconstrucción valida tipos y versiones; utiliza objetos de valor y una fábrica `Auction.reconstitute()` que comprueba las pujas aceptadas y la coherencia de cierre, ganador, monto y estado del pago. Los rechazos históricos se conservan con su motivo original, sin volver a aplicarlos como nuevas pujas. No se omiten silenciosamente registros corruptos.

La guía pide sustituir persistencia sin modificar dominio ni aplicación. Los puertos y casos de uso no cambiaron; el modelo anterior carecía de una fábrica para recuperar estado histórico, por lo que se añadió esa capacidad de dominio. Es una adaptación explícita al criterio estricto, que debe justificarse en la sustentación. No se introdujeron importaciones SQLite, campos de base de datos, SQL ni reglas de infraestructura en el dominio. El adaptador en memoria continúa funcionando.

## Consistencia y límites

Las entidades leídas son independientes. Cada UPDATE compara la revisión leída y la incrementa. Si otra operación guardó antes, devuelve `409 CONCURRENT_MODIFICATION`; no se guarda el estado obsoleto. El cliente debe recargar y decidir si reintenta, sin asumir que la puja fue aceptada. Los IDs y correos duplicados son rechazados sin sustituir cuentas existentes.

El escenario soportado sigue siendo un proceso. Las llamadas SQLite son síncronas y bloquean brevemente el bucle de Node. El documento completo se reconstruye en las consultas; no se promete escalabilidad de grandes historiales ni coordinación entre varios servidores. Las fechas conservan los instantes ISO; el cálculo de plazo de pago existente usa horas locales y se valida al reconstruir. Mantener la zona horaria del servidor entre ejecuciones, especialmente si se usan zonas con horario de verano.

No se incorporan cierre programado, expiración automática, confirmación de pagos, eventos WebSocket, persistencia de notificaciones aún no utilizadas ni cambios de reglas. El perfil y el listado mantienen su comportamiento de lectura; detalle y puja conservan cierre perezoso.

## Configuración y operación

- `DATABASE_PATH=./data/auctions.sqlite`, opcional con ese valor por defecto; ruta relativa al directorio de inicio.
- Se crean las carpetas padre. Rutas vacías o sin permisos producen fallo explícito de inicio.
- `:memory:` solo para pruebas: sus datos desaparecen al cerrar.
- `.gitignore` excluye bases y auxiliares. No versionar archivos con datos de usuarios.
- Para respaldar: detener el servidor y copiar el archivo SQLite configurado. Restaurar con el servidor detenido, usando la misma ruta y versión de esquema. No eliminar la base para actualizar código.
- Para detener: Ctrl+C o SIGTERM cierran el servidor y la conexión después de las peticiones activas.

## Verificación reproducible

```bash
npm run typecheck
npm test
npm run verify:persistence
```

La suite comprueba usuarios únicos, persistencia de hashes, estados OPEN/CANCELLED/DESERTED/CLOSED/DEFAULTED y pago CONFIRMED, historial completo, conflictos de escritura y rechazo explícito de datos inválidos. `verify:persistence` compila y ejecuta dos procesos Node separados: el primero guarda usuarios y una subasta adjudicada; el segundo verifica por HTTP login, perfil, pujas, rechazos, orden de pago y correo duplicado. Sus datos se crean en una carpeta temporal y se eliminan al terminar. Los tests HTTP del perfil y la orden ahora utilizan SQLite aislado.
