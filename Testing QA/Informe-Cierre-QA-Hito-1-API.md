# Informe de Cierre de QA — Hito 1

**Proyecto:** BA Protege+  
**Área:** Testing / QA  
**Versión:** 1.0  
**Fecha:** 09/11/2026  
**Responsable de QA:** Camila Jara

---

## 1. Objetivo

Documentar las pruebas realizadas durante el Hito 1 de BA Protege+, registrar los resultados obtenidos, las evidencias generadas y los puntos pendientes de verificación.

## 2. Alcance de testing

Se realizaron verificaciones sobre las siguientes funcionalidades:

- Registro de usuarios.
- Inicio de sesión.
- Autenticación mediante JWT.
- Selección y actualización del modo.
- Consulta del perfil del usuario.
- Middleware de autenticación y autorización.
- Validación de roles y permisos.
- Seguridad de contraseñas.

## 3. Issues verificadas

| Issue | Funcionalidad | Situación de QA |
|---|---|---|
| #32 | Registro | Pruebas manuales y automatizadas ejecutadas. |
| #33 | Login | Pruebas manuales y automatizadas ejecutadas. |
| #34 | Selección de modo y perfil | Pruebas funcionales ejecutadas. |
| #35 | Middleware de autenticación y autorización | Pruebas ejecutadas; quedan verificaciones pendientes. |

## 4. Pruebas automatizadas

Se ejecutó la suite de pruebas de Backend mediante Jest.

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

También se verificaron mediante revisión de código y pruebas automatizadas:

- Generación del hash de contraseña con bcryptjs.
- Comparación de contraseña mediante `bcrypt.compare`.
- No exposición del `passwordHash` en las respuestas.
- Vigencia del JWT de 7 días.
- Carga del rol en `req.rol`.
- Autorización y rechazo según el rol configurado.

## 5. Pruebas manuales

Se realizaron pruebas mediante Postman para verificar:

- Registro exitoso y validaciones.
- Inicio de sesión con credenciales válidas e inválidas.
- Respuestas HTTP esperadas.
- Contenido y vencimiento del JWT.
- Actualización del modo del usuario.
- Consulta del perfil.
- Acceso sin token.
- Acceso con token inválido.
- Acceso con token expirado.

## 6. Evidencias

Las evidencias se encuentran registradas en la documentación de Testing QA y en el Excel de casos de prueba.

Se generaron capturas de:

- Respuestas de Postman.
- Decodificación y validación del JWT.
- Ejecución de pruebas automatizadas con Jest.
- Rechazo de tokens expirados.

## 7. Pendientes de verificación

Quedan pendientes las siguientes confirmaciones de Backend:

1. Verificar que `req.responsibleId` se inyecte correctamente y llegue a los controladores protegidos.
2. Verificar que `req.userEmail` se inyecte correctamente y llegue a los controladores protegidos.

Se solicitó confirmación al equipo de Backend y se encuentra pendiente de respuesta.

## 8. Conclusión

Durante el Hito 1 se ejecutaron pruebas manuales y automatizadas sobre las funcionalidades de registro, login, selección de modo y middleware de autenticación y autorización.

Las pruebas automatizadas finalizaron correctamente con 59 tests aprobados y ninguna prueba fallida.

El cierre definitivo de QA queda sujeto a resolver las verificaciones pendientes indicadas en este informe y revisar los criterios de aceptación de cada Issue.

**Estado general del Hito 1:** En revisión por QA.

---

**Responsable:** Testing / QA  
**Proyecto:** BA Protege+
