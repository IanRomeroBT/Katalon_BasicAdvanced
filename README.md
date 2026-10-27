# Póliza Lab

Aplicación web local para practicar automatización con Katalon Studio mediante la administración de pólizas y facturas.

## Requisitos

- Node.js 18 o posterior.
- No requiere instalar paquetes ni una base de datos.

## Iniciar

```powershell
npm start
```

Abre `http://localhost:4173`.

También puedes usar otro puerto:

```powershell
$env:PORT=5000
npm start
```

Los datos se guardan en `data/db.json`. El repositorio incluye registros iniciales para comenzar las prácticas inmediatamente.

## Funciones

- Dashboard con indicadores y distribución por ramo.
- Grid, búsqueda y filtros de pólizas.
- Alta con validaciones y factura automática.
- Modificación con propagación de titular e importe a facturas.
- Baja lógica, reactivación y eliminación definitiva.
- Grid, búsqueda, filtro y exportación CSV de facturas.
- Laboratorio integrado de selectores XPath.
- Diseño adaptable a escritorio, tableta y móvil.

## Diseño para Katalon

La dificultad de automatización es intencional:

- Los inputs reciben IDs dinámicos al abrir el formulario.
- Las filas reciben IDs dinámicos cada vez que se renderizan.
- Los botones de acciones carecen de ID y name.
- La búsqueda y los cambios sustituyen nodos del DOM.
- Los folios se generan en el servidor.

Para selectores mantenibles, usa texto visible, relaciones entre elementos y atributos de negocio como `data-policy-key`. Evita guardar los IDs dinámicos capturados por Web Spy sin revisarlos.

Consulta [las historias de usuario](docs/HISTORIAS_USUARIO.md) para criterios de aceptación y la matriz sugerida de ejercicios.

