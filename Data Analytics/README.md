# Data Analytics

Documentación de datos de BA Protege+: qué se recopila, dónde vive, qué eventos se registran y cómo se mide si la protección funciona.

## Índice

| Archivo | Contenido | Issue |
|---|---|---|
| [plan-de-datos-y-telemetria.md](plan-de-datos-y-telemetria.md) | Plan principal: una sección por cada punto del checklist, privacidad y cumplimiento, próximos pasos técnicos con los archivos a tocar, y fuentes | #7 |
| [catalogo-de-eventos.md](catalogo-de-eventos.md) | Tabla de todos los eventos existentes y propuestos (disparador, origen, payload, local o sync, alerta, retención, estado), con un ejemplo JSON por evento | #7 |
| [kpis.md](kpis.md) | KPIs con definición, fórmula, evento fuente, frecuencia, meta orientativa y si hoy se pueden medir | #7 |
| [lista-lotba/](lista-lotba/) | Listado oficial de LOTBA normalizado (CSV y JSON del período 2026-08), con el script `limpiar_lista.py` y su reporte | #9 |

## Relación con la issue #7

*Data | Plan de recopilación de datos, eventos y telemetría*

| Punto del checklist | Dónde está |
|---|---|
| 1. Identificar qué datos será necesario recopilar para la operación básica del MVP | Plan, sección 1 |
| 2. Definir el listado de eventos y acciones a registrar (accesos bloqueados, cambios de permisos, desinstalación) | Plan, sección 2, y el catálogo completo |
| 3. Diferenciar la información local del dispositivo protegido de la sincronizada en el backend | Plan, sección 3, y la columna "Local/sync" del catálogo |
| 4. Proponer KPIs y métricas futuras de efectividad | Plan, sección 4, y kpis.md |

## Convenciones

- **Implementado** quiere decir que ya está en el código, y **Propuesto** que es diseño. Las tablas marcan el estado de cada fila.
- **[verificar]** marca un punto que tiene que confirmar legales, LOTBA o una prueba en un dispositivo real.
- Base del análisis: rama `feat/figma-landing-webapp`, HEAD `5aa003c`, más los cambios sin commitear al 3/11/2026.
- Las metas de los KPIs son hipótesis para validar en el piloto. Los datos de contexto llevan su fuente.

## Mantenimiento

Al agregar o cambiar un `eventType`:
1. Actualizar el catálogo.
2. Actualizar la unión en `backend/src/config/db.ts`.
3. Actualizar los mapeos de presentación en `frontend/src/services/historyService.ts` y `alertService.ts`.
4. Si el evento alimenta una métrica, actualizar kpis.md.
