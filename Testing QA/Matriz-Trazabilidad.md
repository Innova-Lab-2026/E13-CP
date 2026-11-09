# Matriz de Trazabilidad – BA Protege+

**Proyecto:** BA Protege+  
**Área:** Testing QA  
**Hito:** 1 – Onboarding, Autenticación y Selección de Rol  
**Versión:** 1.0

## 1. Objetivo

Relacionar los requisitos solicitados por Backend con los casos de prueba ejecutados por QA, permitiendo identificar qué funcionalidades fueron verificadas y cuáles tienen validaciones pendientes.

## 2. Matriz de trazabilidad

### Issue #32 – Registro

| Requisito | Caso de prueba | Estado |
|---|---|---|
| Registro exitoso | CP-REG-001 | Aprobado |
| Email duplicado | CP-REG-002 | Aprobado |
| Email inválido | CP-REG-003 | Aprobado |
| Campos faltantes | CP-REG-004 | Aprobado |
| Contraseña corta | CP-REG-005 | Aprobado |
| Asignación de rol mediante esResponsable | CP-REG-006 | Aprobado |
| Contenido y expiración del JWT | CP-REG-007 | Aprobado |
| Almacenamiento seguro mediante bcryptjs | CP-SEC-003 | Pendiente de Backend |

### Issue #33 – Login

| Requisito | Caso de prueba | Estado |
|---|---|---|
| Login exitoso | CP-LOG-001 | Aprobado |
| Credenciales vacías | CP-LOG-002 | Aprobado |
| Email inexistente | CP-LOG-003 | Aprobado |
| Contraseña incorrecta | CP-LOG-004 | Aprobado |
| Email mal formado | CP-LOG-005 | Ejecutado |
| Contenido y expiración del JWT de login | CP-LOG-007 | Aprobado |
| Comparación de contraseña mediante bcrypt | Pendiente de definir | Pendiente de Backend |

**Pruebas exploratorias adicionales:** se realizaron comprobaciones de email con mayúsculas y espacios.

### Issue #34 – Selección de modo y consulta de perfil

| Requisito | Caso de prueba | Estado |
|---|---|---|
| Actualizar modo de uso | CP-MOD-001 | Aprobado |
| Actualizar modo sin token | CP-MOD-004 | Aprobado |
| Actualizar modo con token inválido | CP-MOD-005 | Aprobado |
| Actualizar modo con valor inválido | Caso complementario de modo | Ejecutado |
| Consultar perfil con token válido | CP-AUTH-001 | Aprobado |
| Consultar perfil sin token | CP-AUTH-002 | Ejecutado |
| Consultar perfil con token inválido | CP-AUTH-003 | Ejecutado |

**Observación:** Se comprobó que GET `/api/auth/me` devuelve el modo previamente guardado mediante PATCH.

### Issue #35 – Autenticación y autorización

| Requisito | Caso de prueba | Estado |
|---|---|---|
| Acceso sin token | CP-AUTH-002 | Ejecutado |
| Token inválido | CP-AUTH-003 | Ejecutado |
| Token manipulado | CP-AUTH-004 | Ejecutado |
| Token expirado | CP-AUTH-005 | Pendiente de Backend |
| Verificar req.rol en controladores protegidos | Pendiente de definir | Pendiente de Backend |
| Acceso con rol autorizado | Pendiente de definir | Pendiente de Backend |
| Acceso con rol no autorizado | Pendiente de definir | Pendiente de Backend |

## 3. Observaciones generales

- Los casos aprobados cuentan con su documentación y evidencia correspondiente.
- Las pruebas exploratorias se registran por separado de los casos principales.
- Las verificaciones que requieren acceso interno o información de Backend permanecen pendientes de coordinación.
- La aprobación de cada Issue dependerá del cumplimiento de todos sus criterios de aceptación.

## 4. Estado general del Hito 1

El Hito 1 cuenta con pruebas funcionales y negativas ejecutadas y documentadas.

Quedan pendientes algunas verificaciones de seguridad y autorización que requieren coordinación con Backend antes de completar la revisión de QA.

**Documento:** Matriz de Trazabilidad  
**Versión:** 1.0
