# Guía del instructor - Deploy defectuoso

> Contiene las respuestas del ejercicio. No entregar esta guía a los participantes antes de la práctica.

## Escenario

La rama `codex/deploy-defectuoso` representa el despliegue candidato `1.1.0-RC.3`. La aplicación inicia normalmente y permite completar los flujos, pero contiene cinco regresiones funcionales.

La versión estable se conserva en la rama `master`.

## Defectos sembrados

### DEF-01 - Importe incorrecto al facturar una póliza nueva

- **Severidad:** alta.
- **Pasos:** registrar una póliza con prima anual de $10,000; abrir Facturas y buscar el folio creado.
- **Resultado esperado:** la factura tiene importe de $10,000.
- **Resultado actual:** la factura muestra $11,600.
- **Origen técnico:** al crear la factura, el backend multiplica indebidamente la prima por 1.16.

### DEF-02 - La factura no se actualiza al modificar la póliza

- **Severidad:** alta.
- **Pasos:** editar el titular y la prima de una póliza; consultar su factura.
- **Resultado esperado:** titular e importe coinciden con la póliza actualizada.
- **Resultado actual:** la factura conserva los valores anteriores.
- **Origen técnico:** se eliminó la sincronización de facturas en la operación `PUT`.

### DEF-03 - La baja no cancela la factura

- **Severidad:** alta.
- **Pasos:** dar de baja una póliza con factura Pendiente; consultar Facturas.
- **Resultado esperado:** la factura relacionada cambia a Cancelada.
- **Resultado actual:** la factura permanece Pendiente.
- **Origen técnico:** la operación `PATCH` solo actualiza la póliza.

### DEF-04 - Queda una factura huérfana al eliminar

- **Severidad:** crítica por integridad de datos.
- **Pasos:** anotar el folio de una póliza; eliminarla definitivamente; buscar su folio en Facturas.
- **Resultado esperado:** no existe póliza ni factura relacionada.
- **Resultado actual:** la factura sigue visible aunque la póliza fue eliminada.
- **Origen técnico:** la operación `DELETE` ya no elimina datos relacionados.

### DEF-05 - Las búsquedas distinguen mayúsculas y minúsculas

- **Severidad:** media.
- **Pasos:** buscar `mariana` en Pólizas y luego `Mariana`.
- **Resultado esperado:** ambas búsquedas muestran a Mariana Torres.
- **Resultado actual:** solo coincide la búsqueda que conserva las mayúsculas.
- **Origen técnico:** se quitó la normalización a minúsculas en los filtros del navegador.

## Ruta sugerida para la práctica

1. Ejecutar un smoke test para comprobar que la aplicación abre y permite navegar.
2. Ejecutar la regresión de alta, edición, baja y eliminación con evidencia.
3. Clasificar cada falla como dato, script o aplicación bajo prueba.
4. Capturar screenshots y mensajes de verificación en Katalon.
5. Reparar localizadores afectados por el DOM dinámico sin confundirlos con defectos funcionales.
6. Comparar los resultados contra `docs/HISTORIAS_USUARIO.md`.
7. Cambiar a `master` y repetir la suite para confirmar que la línea base funciona.

## Restaurar datos después del ejercicio

```powershell
git show master:data/db.json | Set-Content -Encoding utf8 data/db.json
```

