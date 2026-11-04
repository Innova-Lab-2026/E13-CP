# Matriz de Riesgos Técnicos y Escenarios Críticos

**Proyecto:** BA Protege+  
**Área:** QA / Testing  
**Etapa:** Hito 1 – Onboarding y autenticación  
**Responsable:** QA  
**Versión:** 1.0

## 1. Objetivo

Identificar los posibles riesgos técnicos y funcionales del proyecto BA Protege+, evaluar su impacto y definir qué pruebas se deben realizar para prevenir o detectar problemas.

## 2. Matriz de riesgos

| ID | Riesgo identificado | Probabilidad | Impacto | Prioridad |
|---|---|---|---|---|
| R-001 | Acceso a rutas protegidas sin autenticación. | Media | Alto | Alta |
| R-002 | Uso de tokens inválidos o vencidos. | Media | Alto | Alta |
| R-003 | Asignación incorrecta del rol del usuario. | Media | Alto | Alta |
| R-004 | Actualización incorrecta del modo de uso. | Media | Alto | Alta |
| R-005 | Exposición de información sensible del usuario. | Baja | Alto | Alta |
| R-006 | Registro de usuarios con correo duplicado. | Media | Medio | Media |
| R-007 | Errores durante la vinculación de dispositivos. | Media | Alto | Alta |
| R-008 | Fallas en la aplicación de restricciones. | Media | Alto | Alta |
| R-009 | Posibilidad de evitar o desactivar la protección sin autorización. | Media | Alto | Alta |

## 3. Acciones de QA

| ID de riesgo | Acción de prevención o detección |
|---|---|
| R-001 | Probar el acceso a endpoints protegidos sin token. |
| R-002 | Probar solicitudes con tokens inválidos o vencidos. |
| R-003 | Verificar la asignación de roles responsable y tutor. |
| R-004 | Probar la actualización y consulta de los modos disponibles. |
| R-005 | Verificar que las respuestas no expongan contraseñas ni hashes. |
| R-006 | Intentar registrar dos usuarios con el mismo correo. |
| R-007 | Probar los escenarios de vinculación mediante PIN. |
| R-008 | Verificar el funcionamiento de las restricciones configuradas. |
| R-009 | Realizar pruebas de escenarios de evasión de la protección. |

## 4. Escenarios críticos

Se consideran críticos los siguientes escenarios debido al impacto que podrían generar en la seguridad y el funcionamiento de la aplicación:

- Inicio de sesión y autenticación del usuario.
- Acceso a funcionalidades sin autorización.
- Asignación y validación de roles.
- Selección y actualización del modo de uso.
- Vinculación segura entre dispositivos.
- Aplicación de restricciones.
- Intentos de desactivar o evitar la protección.

## 5. Consideraciones

La probabilidad, el impacto y la prioridad indicados son estimaciones iniciales de QA. Podrán actualizarse a medida que avance el desarrollo y se ejecuten nuevas pruebas.

Los riesgos identificados servirán como referencia para definir los casos de prueba y priorizar las validaciones.
