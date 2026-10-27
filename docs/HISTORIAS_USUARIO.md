# Historias de usuario - Póliza Lab

## Alcance funcional

El sistema administra pólizas y las facturas generadas al momento de su alta. La baja es lógica y reversible; la eliminación es física y requiere confirmación.

### HU-01 - Consultar el resumen de cartera

**Como** administrador de pólizas  
**Quiero** ver indicadores de cartera, pólizas recientes y distribución por ramo  
**Para** conocer rápidamente el estado de la operación.

**Criterios de aceptación**

- Se muestran totales de pólizas, vigentes, facturas pendientes y prima anual.
- La prima anual no incluye pólizas dadas de baja.
- Se muestran las cuatro pólizas más recientes.
- La gráfica agrupa la cartera activa por ramo.

### HU-02 - Consultar y filtrar pólizas

**Como** ejecutivo de operaciones  
**Quiero** consultar el grid de pólizas y filtrarlo  
**Para** localizar un expediente sin revisar toda la cartera.

**Criterios de aceptación**

- El grid muestra folio, titular, ramo, vigencia, prima y estado.
- La búsqueda acepta folio, titular, correo o ramo.
- El filtro permite elegir Vigente, Pendiente o Baja.
- Se presenta un estado vacío cuando no hay coincidencias.

### HU-03 - Dar de alta una póliza

**Como** ejecutivo de operaciones  
**Quiero** registrar una póliza  
**Para** incorporarla a la cartera y generar su factura inicial.

**Criterios de aceptación**

- Titular, correo, ramo, cobertura, prima y fechas son obligatorios.
- El correo debe tener un formato válido y la prima debe ser mayor que cero.
- La fecha final debe ser posterior a la fecha inicial.
- El servidor asigna un folio con formato `POL-AAAA-NNN`.
- Se crea automáticamente una factura pendiente relacionada.
- Se muestra una confirmación con ambos folios y la póliza aparece en el grid.

### HU-04 - Modificar una póliza

**Como** ejecutivo de operaciones  
**Quiero** editar los datos de una póliza  
**Para** mantener el expediente actualizado.

**Criterios de aceptación**

- El formulario presenta los datos actuales.
- Se aplican las mismas validaciones utilizadas en el alta.
- El folio y la fecha de creación no cambian.
- Cambios en titular y prima se reflejan en las facturas relacionadas.

### HU-05 - Dar de baja y reactivar una póliza

**Como** administrador de cartera  
**Quiero** cambiar una póliza a estado Baja y poder reactivarla  
**Para** conservar el historial sin eliminar información.

**Criterios de aceptación**

- La acción Dar de baja cambia el estado a Baja.
- Las facturas relacionadas cambian a Cancelada.
- Una póliza en Baja ofrece la acción Reactivar póliza.
- Al reactivarla vuelve a Vigente y sus facturas quedan Pendientes.

### HU-06 - Eliminar definitivamente una póliza

**Como** administrador autorizado  
**Quiero** eliminar una póliza creada por error  
**Para** retirar el registro y sus datos dependientes.

**Criterios de aceptación**

- El sistema muestra una confirmación explícita antes de eliminar.
- Cancelar la confirmación conserva toda la información.
- Confirmar elimina la póliza y todas sus facturas relacionadas.
- El grid y los indicadores se actualizan sin recargar manualmente la página.

### HU-07 - Consultar facturas creadas

**Como** analista de cobranza  
**Quiero** consultar y filtrar el grid de facturas  
**Para** revisar importes, vencimientos y estado de cobro.

**Criterios de aceptación**

- El grid muestra factura, póliza, cliente, fechas, importe y estado.
- La búsqueda acepta folio de factura, folio de póliza o cliente.
- El filtro permite elegir Pagada, Pendiente o Cancelada.
- Los resultados visibles se pueden exportar en CSV.

### HU-08 - Practicar automatización Web con localizadores complejos

**Como** participante de la capacitación de Katalon Studio  
**Quiero** interactuar con elementos dinámicos y controles sin identificadores fijos  
**Para** construir selectores XPath mantenibles y aplicar esperas explícitas.

**Criterios de aceptación**

- Los IDs de campos y filas se regeneran durante el uso.
- Los menús contextuales no tienen ID ni name.
- El DOM de grids se reemplaza al buscar, filtrar o modificar datos.
- Los folios son generados por el servidor y no se pueden predecir como valores fijos.
- La sección Laboratorio QA documenta ejercicios progresivos.

## Matriz sugerida de pruebas

| Nivel | Caso | Técnica principal |
|---|---|---|
| Básico | Navegar a Pólizas y filtrar por estado | Web Recorder, texto visible |
| Básico | Validar campos obligatorios | Keywords y aserciones |
| Intermedio | Alta completa y validación del nuevo folio | XPath relativo y patrón |
| Intermedio | Buscar la factura asociada | Variables y reutilización |
| Intermedio | Ejecutar altas desde CSV | Data-driven testing |
| Avanzado | Editar desde el menú de una fila específica | XPath por ancestro/descendiente |
| Avanzado | Baja y reactivación | Esperas explícitas y DOM dinámico |
| Avanzado | Reparar un locator basado en ID dinámico | Diagnóstico y self-healing |

