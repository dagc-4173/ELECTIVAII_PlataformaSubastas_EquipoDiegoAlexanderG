# Revisión académica de Entrega 2

Revisión del 2 de noviembre de 2026 contra el checkout que parte de `c49c9be`.

## Fuentes

- `Proyecto Subastas Electiva II.pdf`, 15 páginas: reglas en pp. 3–4, requisitos en pp. 8–10 y Entrega 2 en p. 14.
- `Guía para la Entrega de Proyectos con GITHUB.pdf`, 5 páginas: contenido de README y prácticas de entrega.

Los originales se consultaron en la carpeta local `Electiva II` suministrada por el autor. No se redistribuyen en el repositorio.

## Resultado y orden de implementación

| Prioridad | Alcance | Evidencia actual | Trabajo necesario |
|---|---|---|---|
| 1 | RF-03: perfil y actividad | Implementado: `GET /users/me`, `GetUserProfileUseCase` y cinco pruebas HTTP con registro/login reales | Completado; pruebas HTTP también ejecutadas con SQLite aislado y verificación de recuperación entre procesos |
| 2 | RF-17: consulta de orden por ganador | Implementado: `GET /auctions/{auctionId}/payment-order`, acceso exclusivo del ganador | Completado con pruebas HTTP y OpenAPI; consulta de solo lectura tras cierre |
| 3 | Persistencia real, obligatoria en Entrega 2 | Implementada con SQLite local, adaptadores detrás de los puertos y recuperación del agregado completo | Verificada con bases temporales y dos procesos independientes; revisar la fábrica de reconstitución de dominio descrita en `sqlite-persistence.md` |
| 4 | RF-12–15 y RNF-05: tiempo real | Implementados puerto de salida, adaptador `ws`, autenticación y suscripción por subasta | Verificado con dos clientes reales: difusión, avisos personales, aislamiento, cierre único y fallos de guardado; contrato en `websocket-api.md` |
| 5 | Calidad y documentación | Validación HTTP y errores de JSON, tamaño, contenido y rutas desconocidas implementados | Verificados con pruebas reales; identificación académica y licencia ISC completadas; continuar revisión de entrega |
| 6 | RF-18–20 / RN-17–19: webhook | Confirmación solo en dominio | Verificación de origen antes de mutar, registro idempotente y simulador; opcional en Entrega 2, obligatorio para completar Entrega 3 |

El perfil y la consulta de órdenes deben diseñarse antes del adaptador definitivo para que este cubra las consultas reales. No es necesario proveedor de pagos real, nube, colas ni soporte multiproceso. RF-16 (cantidad de participantes) es opcional.

## RN-23

El detalle requiere JWT y usuario existente. Se añadieron pruebas HTTP que crean una puja, consultan como observador registrado y verifican el historial sin campos de contacto o contraseña. Otra prueba rechaza el detalle sin JWT. El listado público devuelve el mismo mapper; la regla no dice expresamente que el acceso deba ser exclusivo de usuarios registrados. Se conserva el comportamiento y se deja visible esta decisión para la sustentación.

## Condiciones de entrega por comprobar

- Identificación académica completada con los datos suministrados por el autor. Licencia ISC confirmada y archivo `LICENSE` añadido, coherente con `package.json`.
- Verificar acceso público al repositorio, ejecución de la rama de entrega y demostración con dos clientes.
- R-15 toma la versión de `main` antes de la fecha límite. Esta revisión no fusiona con `main`; la integración final requiere una decisión de entrega explícita.
- R-04: limpieza autorizada y publicada en diez ramas; `main` intacta. Pendiente comprobar el residuo de la referencia de fusión antigua del PR #4. Detalle en `history-cleanup.md`.
- El autor informó el 3 de noviembre de 2026 como fecha de entrega vigente; el PDF consultado conserva la fecha anterior del 30/10/2026.

## Validación de este avance

TypeScript, compilación y 207 pruebas exitosas (40 archivos), incluidas las dos nuevas comprobaciones HTTP de RN-23. No se modificó código de producción.

## Avance RF-03

Endpoint `GET /users/me` autenticado; identidad exclusivamente del token. Listas sin duplicados por subasta, participación por pujas aceptadas. Sin paginación ni cierre perezoso en el perfil. Se verificaron 212 pruebas en 41 archivos, TypeScript y compilación. RF-17 se completó en el avance siguiente.

## Avance RF-17

La consulta devuelve la orden existente únicamente al ganador identificado por JWT. No genera órdenes ni confirma o expira pagos. El cierre continúa en los casos de uso de detalle y puja. Se verificaron 220 pruebas en 42 archivos, TypeScript y compilación; ocho pruebas nuevas cubren consulta, repetición, plazo, permisos, autenticación y ausencia de orden. El siguiente bloque es persistencia real detrás de los puertos existentes.

## Avance de persistencia

SQLite es el adaptador por defecto. Los puertos y casos de uso permanecen sin cambios. Se añadió una fábrica explícita de reconstitución al agregado: esto es un cambio acotado de dominio respecto a la formulación estricta de la guía, sin SQL ni dependencias técnicas en el núcleo; no se presenta como ausencia total de cambios de dominio. La decisión y las limitaciones están en `sqlite-persistence.md`.

El siguiente bloque obligatorio es RF-12–15: WebSockets y puerto de salida de eventos.

## Avance de tiempo real

RF-12–15 implementados con emisión posterior al guardado y puerto de salida independiente de `ws`. RF-16 sigue opcional. Se agregó cliente de consola para demostración con dos terminales. El siguiente bloque es revisar validaciones HTTP y errores uniformes, documentación de instalación y condiciones académicas pendientes antes de preparar una entrega. No se integra con `main` automáticamente.

Validación del avance: 243 pruebas en 45 archivos, TypeScript, compilación, OpenAPI y recuperación SQLite entre procesos correctos.

## Avance de validación HTTP

Se validan formato y campos antes de casos de uso, sin trasladar las reglas de negocio al middleware. Se normalizan errores de parser (400/413/415), URL y rutas desconocidas. Los tests cubren ausencia de mutaciones ante formato inválido y conservación de códigos de negocio. Resultado: 274 pruebas en 46 archivos, con SQLite y WebSockets incluidos. Contrato de entrada y errores actualizado en README y OpenAPI.

Pendientes de preparación: nombre completo y equipo oficial en README, confirmación de licencia, revisión de R-04 (valor de ejemplo JWT presente en historial antiguo), fecha/prórroga vigente y decisión explícita de integración de la entrega. No se reescribe historial ni se fusiona `main` como parte de este avance. RF-16 y el webhook siguen opcionales para Entrega 2; la expiración de pagos permanece solo en dominio.

Instalación limpia verificada en una copia sin dependencias, `.env` ni base local: `npm ci`, verificación de tipos, compilación y recuperación SQLite entre dos procesos correctos. No se modificaron las reglas del dominio en este avance.

## Preparación de candidata

`release/entrega-2` acumula los avances anteriores. Se verificó acceso público del repositorio y ausencia de dependencias de infraestructura en las importaciones de dominio/aplicación revisadas. El secreto de ejemplo del historial no coincide con los `.env` locales revisados; el historial no se reescribió. La guía `delivery-two-handoff.md` recoge el guion de sustentación y las condiciones pendientes. No se declara entrega final ni se integra `main`.

## Datos académicos confirmados por el autor

Integrante y nombre oficial del equipo: **Diego Alexander Gutiérrez Cardona**. Fecha de entrega informada: **3 de noviembre de 2026**. README actualizado. El autor confirmó la licencia ISC: `LICENSE` añadido con su autoría de 2026, coherente con `package.json`.

## Licencia confirmada

Se añadió `LICENSE` con el texto ISC y copyright 2026 Diego Alexander Gutiérrez Cardona, tras confirmación explícita del autor. Se actualizaron README y guía de revisión. Este cambio no modifica código, dependencias ni la validación técnica de 274 pruebas.

## Limpieza de historial autorizada

Se reemplazó el historial de diez ramas afectadas, con comprobación de versiones anteriores y respaldo completo. Las ramas descargadas desde GitHub ya no contienen el valor histórico; se detectó por separado una referencia antigua de fusión del PR #4. No se afirma borrado total en la plataforma ni se integra `main`. La copia activa de trabajo es el checkout limpio recién clonado.
