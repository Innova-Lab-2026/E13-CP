# Informe de Cierre QA – Hito 1

## 1. Información general

- **Proyecto:** BA Protege+
- **Área:** QA / Testing
- **Etapa:** Hito 1
- **Responsable:** QA
- **Estado:** En revisión

## 2. Objetivo

Registrar las pruebas realizadas durante el Hito 1, documentar sus resultados y dejar constancia de las observaciones encontradas.

## 3. Pruebas realizadas

### 3.1 Frontend

Se realizaron pruebas manuales sobre los siguientes módulos:

- Registro de usuario.
- Inicio de sesión.
- Selección de modo.

**Total de casos registrados:** 18.

Se verificaron los campos obligatorios, los formatos ingresados, las validaciones y la navegación entre pantallas.

**Observación:** Se detectó una diferencia respecto al teléfono durante el registro: el Frontend lo solicita como obligatorio, mientras que el Backend permite registrar un usuario sin ese dato. Queda pendiente confirmar con el equipo cuál debe ser el comportamiento esperado.

### 3.2 Backend

Se realizaron pruebas sobre los endpoints correspondientes al Hito 1, verificando respuestas, códigos HTTP y validaciones.

La cantidad exacta de casos y sus resultados quedan pendientes de consolidar con el registro de pruebas.

## 4. Evidencias

Las capturas de las pruebas se encuentran organizadas en GitHub dentro de:

`Testing QA/Evidencias/Hito-1/`

- **Front:** evidencias de las pruebas del Frontend.
- **Back:** evidencias de las pruebas del Backend.

## 5. Observaciones

- Se identificó una diferencia entre las validaciones del Frontend y el Backend respecto al teléfono.
- Es necesario confirmar el comportamiento esperado con el equipo.
- Los resultados de las pruebas deben mantenerse respaldados por sus evidencias.

## 6. Conclusión

Durante el Hito 1 se realizaron pruebas sobre el Frontend y el Backend de BA Protege+.

Se registraron los resultados y se organizaron las evidencias correspondientes. Queda pendiente consolidar el detalle de los casos del Backend y confirmar la obligatoriedad del teléfono para completar el cierre de QA.
