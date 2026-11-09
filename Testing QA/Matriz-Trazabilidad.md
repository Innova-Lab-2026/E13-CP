# Matriz de Trazabilidad – BA Protege+

**Proyecto:** BA Protege+  
**Área:** Testing QA  
**Hito:** 1 – Onboarding, Autenticación y Selección de Rol  
**Versión:** 1.1  
**Fecha:** 09/11/2026

## 1. Objetivo

Relacionar los requisitos solicitados por Backend con los casos de prueba ejecutados por QA, permitiendo identificar qué funcionalidades fueron verificadas, cuáles fueron aprobadas y cuáles tienen validaciones pendientes.

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
| Almacenamiento seguro mediante bcryptjs | CP-SEC-003 | Aprobado |

**Observación:** La verificación del hash se realizó mediante una prueba automatizada que comprobó que la contraseña no se almacena en texto plano y que bcrypt.compare valida correctamente la contraseña original.

### Issue #33 – Login

| Requisito | Caso de prueba | Estado |
|---|---|---|
| Login exitoso | CP-LOG-001 | Aprobado |
| Credenciales vacías | CP-LOG-002 | Aprobado |
| Email inexistente | CP-LOG-003 | Aprobado |
| Contraseña incorrecta | CP-LOG-004 | Aprobado |
| Email mal formado | CP-LOG-005 | Ejecutado |
| Contenido y expiración del JWT de login | CP-LOG-007 | Aprobado |
| Comparación de contraseña mediante bcrypt.compare | CP-SEC-004 | Aprobado |

**Pruebas exploratorias adicionales:** Se realizaron comprobaciones de email con mayúsculas y espacios.

**Observación:** Se revisó la utilización de bcrypt.compare en el controlador y se ejecutaron correctamente las pruebas de login exitoso y contraseña incorrecta. No se realizó una prueba unitaria aislada de este método.

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
| Token expirado | CP-AUTH-005 | Aprobado |
| Carga del rol en req.rol | Prueba automatizada BK-1.4 | Aprobado |
| Acceso con rol autorizado | Prueba automatizada BK-1.4 | Aprobado |
| Acceso con rol no autorizado | Prueba automatizada BK-1.4 | Aprobado |
| Inyección de req.responsibleId y req.userEmail | Pendiente de confirmación de Backend | Pendiente |

**Observaciones:**
- Se verificó el rechazo de un token correctamente firmado pero expirado, obteniendo HTTP 403.
- Las pruebas automatizadas de autorización comprobaron el acceso permitido para el rol responsable y el rechazo para el rol tutor en una ruta auxiliar restringida.
- Queda pendiente confirmar la inyección de `req.responsibleId` y `req.userEmail` en los controladores protegidos.
- En el alcance actual del MVP, responsable y tutor tienen los mismos permisos generales, salvo las rutas que configuren restricciones específicas por rol.

## 3. Evidencias de pruebas automatizadas

Se ejecutó la suite de pruebas del Backend mediante Jest.

**Comando utilizado:**

`npm.cmd test -- --runInBand`

**Resultado obtenido:**

- Suites aprobadas: 3 de 3.
- Tests aprobados: 59 de 59.
- Tests fallidos: 0.

Archivos ejecutados:

- `auth.test.ts`
- `blocklist.test.ts`
- `app.test.ts`

**Caso documentado:** CP-AUTH-006 – Ejecución de pruebas automatizadas del middleware.

**Observación:** La ejecución de Jest complementa las pruebas manuales realizadas por QA y las verificaciones específicas de seguridad.

## 4. Observaciones generales

- Los casos aprobados cuentan con documentación y evidencia correspondiente.
- Las pruebas exploratorias se registran por separado de los casos principales.
- Las pruebas automatizadas permiten complementar la validación funcional y de seguridad.
- Las verificaciones que requieren acceso interno o información adicional de Backend permanecen pendientes de coordinación.
- La aprobación definitiva de cada Issue dependerá del cumplimiento de todos sus criterios de aceptación.

## 5. Estado general del Hito 1

El Hito 1 cuenta con pruebas funcionales, negativas, exploratorias y automatizadas ejecutadas y documentadas.

Se verificaron las funcionalidades de registro, login, selección de modo, autenticación mediante JWT y autorización por roles.

Las pruebas automatizadas finalizaron correctamente con 59 tests aprobados y ninguna prueba fallida.

Queda pendiente confirmar con Backend la correcta inyección de `req.responsibleId` y `req.userEmail` en los controladores protegidos.

**Estado general del Hito 1:** En revisión por QA.

---

**Documento:** Matriz de Trazabilidad  
**Versión:** 1.1  
**Área responsable:** Testing / QA
