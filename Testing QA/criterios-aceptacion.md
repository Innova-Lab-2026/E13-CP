# Criterios de Aceptación y Casos de Prueba Principales

**Proyecto:** BA Protege+  
**Área:** QA / Testing  
**Etapa:** Hito 1 – Onboarding y autenticación  
**Versión:** 1.0  
**Responsable:** QA

## 1. Objetivo

Definir las condiciones que deben cumplirse para considerar que las funcionalidades principales del Hito 1 funcionan correctamente.

## 2. Criterios de aceptación

### Registro de usuario

- El sistema debe permitir registrar usuarios con datos válidos.
- Los campos nombre, email y contraseña son obligatorios.
- El email debe tener un formato válido.
- No se debe permitir registrar dos usuarios con el mismo email.
- La contraseña debe tener al menos 6 caracteres.
- El sistema debe generar un token JWT al completar el registro.
- La respuesta no debe exponer la contraseña ni su hash.
- El sistema debe asignar el rol correspondiente según el valor de `esResponsable`.

### Inicio de sesión

- El sistema debe permitir iniciar sesión con credenciales correctas.
- El sistema debe rechazar credenciales incorrectas.
- El email y la contraseña son obligatorios.
- El inicio de sesión exitoso debe devolver un token JWT.
- La respuesta debe incluir los datos del usuario y su rol.
- La respuesta no debe exponer información sensible.

### Selección y actualización de modo

- El sistema debe permitir seleccionar el modo adulto.
- El sistema debe permitir seleccionar el modo dispositivo protegido.
- Solo se deben aceptar los modos definidos por el sistema.
- La actualización del modo debe requerir un token válido.
- El sistema debe guardar el último modo seleccionado.
- La consulta del perfil debe devolver el modo guardado.

### Autenticación y seguridad

- Las rutas protegidas deben requerir autenticación.
- El sistema debe rechazar solicitudes sin token.
- El sistema debe rechazar tokens inválidos o vencidos.
- El token debe contener la información de identificación y rol correspondiente.

## 3. Casos de prueba principales

| ID | Módulo | Escenario |
|---|---|---|
| CP-REG-001 | Registro | Registro exitoso. |
| CP-REG-002 | Registro | Registro con email duplicado. |
| CP-REG-003 | Registro | Registro con email incorrecto. |
| CP-REG-004 | Registro | Registro con campos obligatorios vacíos. |
| CP-REG-005 | Registro | Registro con contraseña inválida. |
| CP-LOG-001 | Login | Inicio de sesión exitoso. |
| CP-LOG-002 | Login | Inicio de sesión con campos vacíos. |
| CP-LOG-003 | Login | Inicio de sesión con email inexistente. |
| CP-LOG-004 | Login | Inicio de sesión con contraseña incorrecta. |
| CP-LOG-005 | Login | Inicio de sesión con email incorrecto. |
| CP-MOD-001 | Modo | Selección del modo adulto y dispositivo protegido. |
| CP-AUTH-001 | Autenticación | Acceso a ruta protegida con token válido. |
| CP-AUTH-002 | Autenticación | Acceso a ruta protegida sin token. |
| CP-AUTH-003 | Autenticación | Acceso a ruta protegida con token inválido. |

## 4. Condiciones para considerar una prueba aprobada

Una prueba se considera aprobada cuando:

- El sistema responde de acuerdo con el resultado esperado.
- El código HTTP coincide con el esperado.
- Los datos devueltos son correctos.
- No se expone información sensible.
- El comportamiento coincide con los criterios de aceptación definidos.

## 5. Consideraciones

Este documento representa una primera versión de los criterios de aceptación y casos principales del Hito 1.

Los criterios y casos podrán actualizarse a medida que avance el desarrollo, se incorporen nuevas funcionalidades y se realicen pruebas adicionales.

Los resultados de ejecución y evidencias se registran en el documento de casos de prueba de QA.
