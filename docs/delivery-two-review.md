# Revisión académica de Entrega 2

Revisión del 2 de noviembre de 2026 contra el checkout que parte de `c49c9be`.

## Fuentes

- `Proyecto Subastas Electiva II.pdf`, 15 páginas: reglas en pp. 3–4, requisitos en pp. 8–10 y Entrega 2 en p. 14.
- `Guía para la Entrega de Proyectos con GITHUB.pdf`, 5 páginas: contenido de README y prácticas de entrega.

Los originales se consultaron en la carpeta local `Electiva II` suministrada por el autor. No se redistribuyen en el repositorio.

## Resultado y orden de implementación

| Prioridad | Alcance | Evidencia actual | Trabajo necesario |
|---|---|---|---|
| 1 | RF-03: perfil y actividad | Implementado: `GET /users/me`, `GetUserProfileUseCase` y cinco pruebas HTTP con registro/login reales | Completado con repositorios en memoria; verificar también con el futuro adaptador real |
| 2 | RF-17: consulta de orden por ganador | El dominio genera la orden al cerrar; el mapper no la expone | Consulta autorizada para el ganador, respuestas HTTP, OpenAPI y pruebas |
| 3 | Persistencia real, obligatoria en Entrega 2 | Solo repositorios en memoria | Elegir motor justificando ejecución local, implementar adaptadores detrás de los puertos, conservar agregado e historial, verificar reinicios y unicidad |
| 4 | RF-12–15 y RNF-05: tiempo real | No hay servidor WebSocket ni puerto de eventos | Puerto de salida, eventos después de persistir, suscripción por subasta, nueva puja, aviso al superado y cierre; prueba con dos clientes |
| 5 | Calidad y documentación | Hay errores uniformes para errores explícitos; no hay validación HTTP general | Validar entradas, revisar errores de JSON y rutas desconocidas, actualizar contratos y probar instalación desde cero |
| 6 | RF-18–20 / RN-17–19: webhook | Confirmación solo en dominio | Verificación de origen antes de mutar, registro idempotente y simulador; opcional en Entrega 2, obligatorio para completar Entrega 3 |

El perfil y la consulta de órdenes deben diseñarse antes del adaptador definitivo para que este cubra las consultas reales. No es necesario proveedor de pagos real, nube, colas ni soporte multiproceso. RF-16 (cantidad de participantes) es opcional.

## RN-23

El detalle requiere JWT y usuario existente. Se añadieron pruebas HTTP que crean una puja, consultan como observador registrado y verifican el historial sin campos de contacto o contraseña. Otra prueba rechaza el detalle sin JWT. El listado público devuelve el mismo mapper; la regla no dice expresamente que el acceso deba ser exclusivo de usuarios registrados. Se conserva el comportamiento y se deja visible esta decisión para la sustentación.

## Condiciones de entrega por comprobar

- Completar en README el nombre completo del integrante (no inferirlo del usuario Git) y el equipo; declarar la licencia coherente con `package.json` (actualmente ISC).
- Verificar acceso público al repositorio, ejecución de la rama de entrega y demostración con dos clientes.
- R-15 toma la versión de `main` antes de la fecha límite. Esta revisión no fusiona con `main`; la integración final requiere una decisión de entrega explícita.
- R-04 prohíbe claves en el historial. El commit anterior retiró un valor de `JWT_SECRET` del ejemplo actual, pero ello no lo elimina del historial. Confirmar si fue un valor utilizado y sustituirlo en los entornos que lo usen; cualquier reescritura de historial queda fuera de esta revisión.
- El PDF indica 30/10/2026 para Entrega 2. Confirmar con el docente cualquier prórroga o fecha vigente; no se presupone una extensión.

## Validación de este avance

TypeScript, compilación y 207 pruebas exitosas (40 archivos), incluidas las dos nuevas comprobaciones HTTP de RN-23. No se modificó código de producción.

## Avance RF-03

Endpoint `GET /users/me` autenticado; identidad exclusivamente del token. Listas sin duplicados por subasta, participación por pujas aceptadas. Sin paginación ni cierre perezoso en el perfil. Se verificaron 212 pruebas en 41 archivos, TypeScript y compilación. El siguiente pendiente funcional es RF-17.
