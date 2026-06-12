# Finanzas - CACITUS

Dashboard financiero estático con HTML, CSS y JavaScript, preparado para desplegarse en Vercel y consumir datos desde una API de Google Apps Script conectada a Google Sheets.

## Acceso

- Usuario: `CACITUS`
- Contraseña: `Fincacitus`

## Estructura

```text
index.html
frontend/
  index.html
  styles.css
  src/
    app.js
    config.js
    mock-data.js
backend-config/
  apps-script-api.gs
api/
  finanzas.js
vercel.json
package.json
```

## Configurar Google Apps Script

1. Abra el libro de Google Sheets.
2. Vaya a Extensiones > Apps Script.
3. Pegue el contenido de `backend-config/apps-script-api.gs`.
4. Despliegue como aplicación web.
5. Copie la URL pública del despliegue.
6. En Vercel, cree la variable de entorno `APPS_SCRIPT_URL` con esa URL.

La app espera registros JSON con campos equivalentes a:

```json
{
  "hoja": "Pagos de afiliados",
  "fecha": "2026-01-08",
  "concepto": "Cuota afiliación enero",
  "responsable": "Comercial",
  "monto": 450000,
  "estado": "Recaudado",
  "categoria": "Afiliados"
}
```

## Despliegue

Suba este directorio a GitHub y conecte el repositorio en Vercel. La raíz incluye `index.html` para evitar errores 404 en Vercel, mantiene los recursos dentro de `frontend/` y expone `/api/finanzas` como proxy seguro hacia Apps Script.

Mientras no se configure `APPS_SCRIPT_URL`, el dashboard mostrará datos de demostración para validar diseño, tablas, KPIs, gráficos y PDF.
