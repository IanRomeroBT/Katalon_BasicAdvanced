# Póliza Lab 2.0

## Objetivo del release

Ampliar el ciclo de pruebas más allá del CRUD de pólizas mediante relaciones entre entidades, reglas de integridad, transiciones de estado y nuevos escenarios de regresión.

## Funcionalidades incorporadas

- Módulo completo de siniestros con registros iniciales.
- Alta de siniestros asociada a pólizas vigentes.
- Validación de la fecha del incidente contra la vigencia.
- Grid con búsqueda, filtro y estados editables.
- Flujo Reportado → En revisión → Aprobado/Rechazado → Pagado.
- Eliminación controlada según el estado del expediente.
- Protección referencial al eliminar pólizas con siniestros.
- Registro de pago para facturas pendientes.
- Indicador de siniestros abiertos en el dashboard.
- Identificadores dinámicos también en el nuevo módulo.

## Nuevas oportunidades de automatización

1. Encadenar alta de póliza, captura de folio y reporte de siniestro.
2. Usar datos de una respuesta como entrada de otro flujo.
3. Validar reglas cruzadas de fecha y estado.
4. Probar transiciones con datasets y aserciones por fila.
5. Verificar respuestas negativas HTTP 400 y 409.
6. Trabajar con selects dinámicos dentro de filas regeneradas.
7. Comprobar que una acción desaparece después de registrar un pago.

## Identificación

- Rama: `codex/release-2.0`
- Etiqueta visual: `RELEASE 2.0`
- Base: rama estable `main`

