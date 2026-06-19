# Finanzas Familiares Inteligentes

Aplicacion web local para administrar finanzas familiares: ingresos, gastos, integrantes, cumpleanos, metas de ahorro y reparto proporcional de gastos comunes segun ingresos.

## Ejecutar

```powershell
python app.py
```

Luego abrir:

```text
http://localhost:8765
```

## Incluye

- Backend Python sin dependencias externas.
- Base de datos SQLite en `data/finanzas.db`.
- API JSON para dashboard, integrantes, movimientos, cumpleanos y solicitudes.
- Frontend moderno responsive en `static/`.
- Calculo proporcional de gastos comunes.
- Datos semilla para probar la aplicacion desde el primer inicio.

## Seguridad considerada

- Validacion basica de payloads.
- Consultas SQL parametrizadas.
- Cabeceras de seguridad HTTP.
- Separacion de datos por familia.
- Preparado para evolucionar a autenticacion real, roles y auditoria extendida.

