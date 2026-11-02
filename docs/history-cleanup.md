# Corrección del historial de configuración

El 2 de noviembre de 2026 el autor autorizó eliminar un valor antiguo de `JWT_SECRET` presente en `.env.example` histórico. La corrección se publicó en las diez ramas afectadas, incluida `release/entrega-2`.

## Alcance comprobado

- Se preservaron respaldos locales completos antes de modificar GitHub.
- Solo se retiró el valor exacto del ejemplo histórico; no se eliminaron archivos del proyecto.
- Autores, fechas y mensajes de los commits del rango revisado se conservaron. Los identificadores cambiaron por la reescritura.
- El árbol final de la candidata quedó idéntico al anterior: la limpieza no cambió código, licencia ni documentación de ese estado.
- `main` conservó el mismo identificador y no fue actualizada.
- La descarga posterior verificó las diez referencias publicadas y la ausencia del valor en el historial alcanzable de todas las ramas.

## Residuo administrado por GitHub

La primera descarga de verificación posterior todavía encontró el valor a través de `refs/pull/4/merge`, una referencia antigua de fusión del PR #4; su rama de origen ya apuntaba al historial limpio. No se afirma eliminación completa de referencias internas, vistas cacheadas, clones o forks. Este residuo debe verificarse de nuevo y, si persiste, gestionarse con GitHub; no se resuelve publicando sobre `refs/pull/*`, que son referencias administradas por el servicio.

El valor histórico no coincidía con los de los dos `.env` locales revisados. Esto no demuestra que nunca se hubiera utilizado en otro entorno. Los respaldos antiguos se conservan fuera del repositorio limpio y no deben publicarse.

Referencia técnica: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository.

## Copias de trabajo

Se creó una copia nueva desde GitHub en la carpeta local `ELECTIVAII_PlataformaSubastas_Entrega2_Limpio`. Las dos copias anteriores se conservaron con sus archivos, y sus pushes se bloquearon localmente para prevenir la reintroducción accidental del historial retirado.

No mezclar el historial antiguo con la candidata limpia ni volver a publicarlo. Para continuar en otra ubicación, clonar nuevamente el repositorio y seleccionar `release/entrega-2`. Conservar la configuración y los datos locales por separado; no sobrescribir un `.env` ni publicar una base de datos.

## Estado académico

La corrección aborda el hallazgo R-04 en las ramas publicadas. Mientras subsistan referencias antiguas de la plataforma no se presenta como borrado total de toda copia ni como garantía de conformidad académica completa. Las funcionalidades y la evidencia de desarrollo gradual se conservaron. La integración final en `main` continúa pendiente de autorización independiente.

## Validación del checkout limpio

`npm ci`, TypeScript, 274 pruebas en 46 archivos y recuperación SQLite entre dos procesos correctos. La primera ejecución de Vitest tuvo un cierre inesperado de un worker; se repitió con `npm test -- --maxWorkers=2` y pasó completa. No se modificó código para obtener ese resultado.
