# KPIs y métricas

> Issue #7 · BA Protege+ · versión 1, 3/11/2026 · Eventos en [catalogo-de-eventos.md](catalogo-de-eventos.md)

## Cómo leer esta tabla

- **¿Hoy?**
  - **Sí**: se puede calcular con los modelos y datos actuales. Ojo: el backend guarda todo en memoria (`backend/src/config/db.ts`), así que el número vale solo mientras el proceso no se reinicie. En Vercel serverless, cada instancia tiene su propia memoria. Ninguna serie temporal es confiable hasta que haya persistencia.
  - **Parcial**: está la estructura, pero falta un campo o un emisor.
  - **No**: falta la instrumentación.
- **Meta orientativa:** son hipótesis del equipo para validar en el piloto. No hay benchmarks públicos de retención ni de cobertura para apps de bloqueo de apuestas en menores.
- **WAD** (dispositivos protegidos activos por semana): dispositivos con heartbeat y VPN activa en los últimos 7 días. Es el denominador de varias métricas.
- **`DeviceDailyStat`**: agregado diario por dispositivo (`heartbeats`, `vpnActiveMinutes`, `lastBlocklistVersion`), derivado del heartbeat y de los eventos `PROTECTION_*` y `VPN_REVOKED`. El heartbeat solo pisa el último valor, así que sin este agregado no hay serie temporal para A7, A8, B1, B2, D4 ni E4.
- **Bloqueos:** B3, B5, E1 y E3 cuentan solo `ACCESS_ATTEMPT` con `metadata.trigger=DNS_BLOCK`. La prueba manual "Probar un sitio" (`MANUAL_CHECK`) no es un intento real.
- **Franjas de edad:** se guardan internas de 10-12, 13-14, 15-16 y 17, calculadas en el backend con el año de nacimiento. Para reportar se agregan en los cortes de SEDRONAR (≤14, 15-16, ≥17). Nunca se exporta el año.

## Advertencias de interpretación

- **Contar bloqueos no mide impacto.** Przybylski y Nash (2017) estudiaron a 1.030 adolescentes y no encontraron que los filtros hogareños redujeran las experiencias negativas en línea. Advierten sobre la "falsa tranquilidad" de los padres.
- **Una baja de bloqueos (B3) puede ser éxito o evasión.** Siempre se lee junto con la cobertura (B1) y las interrupciones (C1).
- **Más control no es mejor.**
  - Ghosh, Wisniewski y otros (CHI 2018, *A Matter of Control or Safety?*) asociaron un control parental más restrictivo con más riesgos en línea, sin poder probar causalidad.
  - Ghosh, Badillo-Urquiola y otros (CHI 2018, *Safety vs. Surveillance*) encontraron que los chicos ven estas apps como invasivas y piden más comunicación con sus padres.
  - Por eso se mide también la transparencia y el resultado percibido (E5), no solo el control.
- **Hay que medir el sobrebloqueo (D5).** Es práctica estándar en la evaluación de filtros.

## A. Activación

| ID | KPI | Definición | Fórmula | Evento fuente | Frecuencia | Meta orientativa | ¿Hoy? |
|---|---|---|---|---|---|---|---|
| A1 | Registro → PIN | Adultos que crean el PIN después de registrarse | adultos con `pinHash` / adultos registrados en la cohorte | `Responsible.createdAt`, `pinUpdatedAt` | Semanal | ≥80% | Sí |
| A2 | PIN → perfil creado | Adultos con PIN que crean al menos un dispositivo | adultos con ≥1 `Device` / adultos con PIN | `Device.createdAt` | Semanal | ≥70% | Sí |
| A3 | Perfil → vínculo confirmado | Perfiles que terminan vinculados en un celular | alertas `DEVICE_LINKED` / alertas `DEVICE_PENDING` | Alertas `DEVICE_*` | Semanal | ≥75% | Sí |
| A4 | Vínculo → VPN activa | Dispositivos vinculados que activan la VPN en 24 h o menos | dispositivos con `PROTECTION_ENABLED` dentro de las 24 h del vínculo / vinculados | `PROTECTION_ENABLED` | Semanal | ≥90% | No |
| A5 | Tiempo a protección | Cuánto tarda un adulto nuevo en dejar un celular protegido | mediana(primer `PROTECTION_ENABLED` − `Responsible.createdAt`) | `createdAt` + `PROTECTION_ENABLED` | Semanal | <15 min | Parcial (se mide hasta el vínculo, vía alertas) |
| A6 | Fricción del PIN | PIN errados al vincular | `PIN_VERIFICATION_FAILED` con `context=LINK` / intentos de `confirm-link` | `PIN_VERIFICATION_FAILED` | Semanal | <10% | No (hoy `confirm-link` devuelve 401 sin registro) |
| A7 | WAD | Dispositivos protegidos activos por semana | dispositivos con `heartbeats > 0` y `vpnActiveMinutes > 0` en algún día de los últimos 7 | `DeviceDailyStat` (derivado del heartbeat) | Diaria | Creciente | No (`status=active` es solo un proxy) |
| A8 | Retención de la protección D7/D30 | Dispositivos de la cohorte que siguen protegidos el día N | dispositivos de la cohorte con `DeviceDailyStat` con heartbeat el día N / vinculados de la cohorte | `DeviceDailyStat` (derivado del heartbeat) | Semanal | D30 ≥70% | No |
| A9 | Atención a las alertas | Si el adulto lee las alertas y qué tan rápido | alertas con `read=true` / alertas creadas; mediana(`readAt` − `createdAt`) | `AlertItem.read`, `readAt` (nuevo) | Semanal | ≥60% leídas, <24 h | Parcial (la tasa sí, el tiempo no) |

Los benchmarks de retención de apps Android en general (D30 de 2% a 6% según Adjust y AppsFlyer) **no se comparan** con A8. En esta app, retener quiere decir que la protección sigue activa en el celular del menor, no que el adulto abra la app.

## B. Protección

| ID | KPI | Definición | Fórmula | Evento fuente | Frecuencia | Meta orientativa | ¿Hoy? |
|---|---|---|---|---|---|---|---|
| B1 | Cobertura de la VPN | Proporción del tiempo desde el vínculo en que la VPN estuvo activa | Σ `vpnActiveMinutes` / Σ minutos desde el vínculo, por dispositivo | `DeviceDailyStat` (derivado del heartbeat y de `PROTECTION_ENABLED`, `PROTECTION_DISABLED`, `VPN_REVOKED`) | Diaria | ≥95% | No |
| B2 | Dispositivos bien cubiertos | Dispositivos activos con cobertura alta | dispositivos con B1 ≥95% / WAD | `DeviceDailyStat` (vía B1) | Semanal | ≥85% | No |
| B3 | Bloqueos por dispositivo | Intentos bloqueados por dispositivo activo y por semana | Σ `count` de `ACCESS_ATTEMPT` con `trigger=DNS_BLOCK` / WAD | `ACCESS_ATTEMPT` | Semanal | Sin meta: se mira la tendencia | Parcial (el modelo existe, pero hoy solo llegan los de la prueba manual, que no cuentan) |
| B4 | Tendencia de bloqueos | Variación de B3 normalizada por la cobertura | (B3 de la semana / B1) contra la semana anterior | B3 + B1 | Semanal | Baja sostenida con B1 estable | No |
| B5 | Dominios únicos intentados | Variedad de sitios que se intentan | dominios distintos con `ACCESS_ATTEMPT` (`DNS_BLOCK`) por dispositivo | `ACCESS_ATTEMPT` | Mensual | Sin meta | Parcial (ídem B3) |
| B6 | Efectividad técnica (QA) | Qué parte de una muestra de dominios activos bloquea de verdad el filtro | dominios de la muestra que resuelven NXDOMAIN con la VPN activa / dominios de la muestra activos | Prueba controlada en un dispositivo de QA, al estilo de GambleAware | Mensual | ≥95% | No |

## C. Integridad y evasión

| ID | KPI | Definición | Fórmula | Evento fuente | Frecuencia | Meta orientativa | ¿Hoy? |
|---|---|---|---|---|---|---|---|
| C1 | Interrupciones de la protección | Cortes no autorizados por dispositivo | (`VPN_REVOKED` + `PROTECTION_DISABLED` con `authorized=false`) / WAD, por semana | `VPN_REVOKED`, `PROTECTION_DISABLED` | Semanal | <0,2 por dispositivo y semana | No |
| C2 | Intentos de evasión | Señales de bypass por dispositivo | (`BYPASS_ATTEMPT` + `VPN_PERMISSION_DENIED` + `PERMISSION_CHANGED` con `granted=false`) / WAD | Esos eventos | Semanal | Tendencia a la baja | Parcial (`BYPASS_ATTEMPT` hoy solo cubre PIN incorrecto en el dispositivo, que migra a `PIN_VERIFICATION_FAILED`) |
| C3 | Silencio o posible desinstalación | Dispositivos activos que dejan de reportar | dispositivos con `APP_UNINSTALL_SUSPECTED` (más de 72 h sin heartbeat) / dispositivos activos al empezar el mes | `APP_UNINSTALL_SUSPECTED`, `DEVICE_OFFLINE` | Diaria | <3% por mes | No |
| C4 | Tiempo de reacción del adulto | Cuánto tarda el adulto en leer una alerta de integridad | mediana(`readAt` − `createdAt`) de las alertas de C1-C3 | `AlertItem.readAt` | Mensual | <12 h | No |
| C5 | Integridad de la ingesta | Eventos rechazados por credencial inválida | eventos rechazados / eventos recibidos | Log de `POST /api/events/batch` con autenticación del dispositivo | Semanal | Cerca de 0 | No (hoy el endpoint es público: `event.routes.ts:13`) |
| C6 | PIN fallido al apagar | Intentos de apagar la protección con un PIN incorrecto | `PIN_VERIFICATION_FAILED` con `context=DISABLE` / WAD | `PIN_VERIFICATION_FAILED` | Semanal | Tendencia a la baja | Parcial (hoy se puede aproximar con los `BYPASS_ATTEMPT` que manda la app protegida) |

## D. Calidad de la lista

| ID | KPI | Definición | Fórmula | Evento fuente | Frecuencia | Meta orientativa | ¿Hoy? |
|---|---|---|---|---|---|---|---|
| D1 | Altas y bajas por período | Cuánto cambia la lista oficial en cada sincronización | `added.length`, `removed.length` del último sync | `BlocklistSyncLog` | Por sync (mensual) | Que refleje a LOTBA | Sí |
| D2 | Latencia de publicación | Demora entre la fecha del snapshot oficial y su carga en el backend | `syncLog.updatedAt` − `snapshot.updatedAt` | `BlocklistSyncLog`, `blocklistSource` | Por sync | <48 h | Sí (en el backend) |
| D3 | Latencia de propagación | Demora hasta que los celulares aplican la versión nueva | p90(`occurredAt` de `BLOCKLIST_UPDATED` − hora del sync) | `BLOCKLIST_UPDATED` | Por sync | p90 <24 h | No (la lista del backend llega por JS cuando se abre la app, pero no hay versión ni evento `BLOCKLIST_UPDATED`) |
| D4 | Dispositivos al día | Dispositivos con la versión vigente | dispositivos con `lastBlocklistVersion` vigente / WAD | `DeviceDailyStat` (derivado del heartbeat) | Diaria | ≥95% | No |
| D5 | Falsos positivos | Sobrebloqueo confirmado | reportes `FALSE_POSITIVE_REPORTED` confirmados en la revisión / dominios bloqueados únicos | `FALSE_POSITIVE_REPORTED` | Mensual | <1% | No |
| D6 | Huecos de la lista | Dominios que agregan varios adultos y no están en LOTBA | dominios `CUSTOM` agregados por ≥N adultos que no están en la lista oficial | `BlocklistItem` tipo `CUSTOM` | Mensual | Insumo para sugerirle dominios a LOTBA | Sí (pero al borrar un dominio se pierde el historial) |

## E. Impacto (agregados anónimos)

Reglas para todos los agregados de este grupo:
- No publicar celdas con menos de 10 dispositivos.
- No exportar `deviceId`, `deviceName`, email, año o fecha de nacimiento, hora exacta ni ubicación.
- Usar solo datos disociados, según el art. 28 de la Ley 25.326.
- No contar eventos con `metadata.unverifiedDomain=true` ni con `trigger=MANUAL_CHECK`.
- Compartir con LOTBA requiere un convenio **[verificar]**.

| ID | KPI | Definición | Fórmula | Evento fuente | Frecuencia | Meta orientativa | ¿Hoy? |
|---|---|---|---|---|---|---|---|
| E1 | Ranking de dominios intentados | Los sitios más buscados | top N dominios por cantidad de dispositivos distintos con `ACCESS_ATTEMPT` (`DNS_BLOCK`) | `ACCESS_ATTEMPT` | Mensual | Informe | No |
| E2 | Intentos por franja de edad | Bloqueos por dispositivo según la franja | B3 por franja (≤14, 15-16, ≥17) | `ACCESS_ATTEMPT` + franja calculada del `Device` | Trimestral | Segmentado con los cortes de SEDRONAR (B3 mide bloqueos, no prevalencia de apuestas, así que no se compara) | No |
| E3 | Dominios fuera de LOTBA | Sitios de apuestas bloqueados por listas personalizadas | dominios con `ACCESS_ATTEMPT` (`DNS_BLOCK`) que solo están en `CUSTOM` | `ACCESS_ATTEMPT` + D6 | Mensual | Insumo para fiscalización | No |
| E4 | Horas protegidas | Volumen de protección efectiva | Σ `vpnActiveMinutes` / 60 de los WAD | `DeviceDailyStat` (derivado del heartbeat) | Trimestral | Difusión | No |
| E5 | Resultado percibido | Si el adulto percibe menos intentos o conflictos | % de respuestas positivas en una encuesta in-app a los 30 y 90 días del vínculo | Encuesta (nueva) | Trimestral | Construir una línea de base | No |

## Set mínimo del MVP

A1, A2, A3, A4, A7, B1, B3, C1, C3, D1, D2, D3.

**Se calculan hoy:** A1, A2, A3, la tasa de A9, D1, D2 y D6, con la salvedad de la base en memoria. Para el resto falta:
1. Persistencia.
2. Que la VPN emita eventos y heartbeat, y el agregado `DeviceDailyStat` en el backend.
3. Que la lista llegue versionada y se actualice en segundo plano, sin depender de que se abra la app.
4. Los tipos de evento propuestos en el catálogo y el campo `metadata.trigger` en `ACCESS_ATTEMPT`.
5. Los campos `occurredAt`, `readAt`, `blocklistVersion` y `protectionState`.

## Contexto para interpretar los números

Estos datos sirven para dimensionar el problema y elegir segmentos. No sirven para fijar metas. Varias cifras salen de prensa y no del informe oficial. Además, las fuentes no se pueden comparar directamente: SEDRONAR mide "últimos 12 meses", mientras que la Defensoría y UNICEF miden "alguna vez".

| Fuente | Dato | Origen |
|---|---|---|
| SEDRONAR, 7.º Estudio Nacional en Estudiantes de Secundaria (nov. 2025) | 26,2% apostó dinero en los últimos 12 meses y 20,5% lo hizo online. Online por edad: ≤14 años 19,7%, 15-16 años 20,4%, ≥17 años 21,7% | Prensa: El Resaltador, Canal 12 (no encontramos el PDF oficial) |
| Defensoría del Pueblo CABA (oct. 2024; 2.765 estudiantes de 12 a 19 años en 25 escuelas) | 24% apostó online alguna vez, 8,8% apuesta con frecuencia, 47,9% apuesta desde su casa y 73,1% llegó por amigos o familia | Prensa: Perfil, FocusGN |
| UNICEF, Kids Online Argentina 2025 | Uno de cada cuatro adolescentes apostó alguna vez; la edad de inicio típica ronda los 13 años | Comunicado de UNICEF Argentina, 2/10/2025, sobre Kids Online Argentina 2025 (el porcentaje exacto y el rango de edad del informe completo quedan **[verificar]**) |
| LOTBA | 2.390 sitios bloqueados desde 2024 (a fines de 2025) **[verificar: falta la fuente oficial]**. En marzo de 2025, la Justicia de la Ciudad ordenó bloquear 72 plataformas tras una investigación de la fiscalía especializada con LOTBA | Prensa del sector: FocusGN; Yogonet, 31/3/2025 |
| GambleAware / Winning Moves (2018) | El mejor software evaluado bloqueó cerca del 95% de los sitios con licencia y el peor, cerca del 59% | Informe de evaluación |

Qué implica para las métricas:
- Casi la mitad apuesta desde la casa, así que la cobertura (B1) tiene que valer tanto con Wi-Fi como con datos móviles.
- La llegada por amigos hace que importe la latencia de propagación de la lista (D3).
- Conviene segmentar con las franjas de SEDRONAR (E2).

## Fuentes

- GambleAware, *Blocking software evaluation* (2018): https://www.gambleaware.org/media/2yljgspz/blocking-software-evaluation-findings-reportt.pdf
- Przybylski y Nash, *Journal of Pediatrics* (2017): https://www.oii.ox.ac.uk/?p=10810, https://ora.ox.ac.uk/objects/uuid:a8a4bab4-9962-45b2-ac6f-21dff5fff1f0/files/m6ab08c1ffbf4015af7b85f4a9de4963c
- Ghosh, Wisniewski y otros, *A Matter of Control or Safety? Examining Parental Use of Technical Monitoring Apps on Teens' Mobile Devices* (CHI 2018): https://pure.psu.edu/en/publications/a-matter-of-control-or-safety-examining-parental-use-of-technical/
- Ghosh, Badillo-Urquiola, Guha y otros, *Safety vs. Surveillance: What Children Have to Say about Mobile Apps for Parental Control* (CHI 2018): https://www.eecs.ucf.edu/~jjl/pubs/pn1838-ghoshA.pdf
- Sobrebloqueo de filtros, JAMA (2002): https://jamanetwork.com/journals/jama/fullarticle/195607
- Retención de apps (referencia general): https://getstream.io/blog/app-retention-guide, https://demo-1.adjust.com/blog/what-makes-a-good-retention-rate/
- SEDRONAR (vía prensa): https://elresaltador.com.ar/las-apuestas-con-dinero-se-expanden-entre-adolescentes-con-fuerte-predominio-de-las-plataformas-online/, https://canal12web.com/el-26-de-los-estudiantes-secundarios-realiza-apuestas-con-dinero-en-argentina/
- Defensoría del Pueblo CABA (vía prensa): https://www.perfil.com/noticias/sociedad/apuestas-online-un-nuevo-estudio-mostro-que-afecta-al-24-de-los-estudiantes-secundarios-de-caba.phtml, https://focusgn.com/latinoamerica/encuesta-en-escuelas-secundarias-revela-que-1-de-cada-4-jovenes-de-la-ciudad-de-buenos-aires-hizo-una-apuesta-online-al-menos-una-vez
- UNICEF Argentina: https://www.unicef.org/argentina/comunicados-prensa/apuestas-online-salud-mental, https://www.unicef.org/argentina/informes/kids-online-ninios-ninias-adolescentes-conectados
- LOTBA (vía prensa): https://focusgn.com/latinoamerica/lotba-lanza-capacitaciones-para-operadores-procesados-por-causas-relacionas-al-juego-ilegal, https://www.yogonet.com/international/news/2025/03/31/99996-city-of-buenos-aires-orders-blocking-of-72-illegal-betting-platforms
