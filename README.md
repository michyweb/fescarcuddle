# fescarcuddle

## Requisitos previos

Antes de levantar el stack hay que definir al menos una variable de entorno en el host (o en un archivo `.env`):

### Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `TARGET_URL` | **Sí** | URL del sitio que se clonará/añadirá como target. Al arrancar, `add_target.js` la usa para crear el target en MongoDB antes de iniciar el servidor. |
| `TARGET_LANGUAGE` | No | Accept-Language que se pasará al navegador headless (ej. `es-419,es;q=0.9,en;q=0.8`). Por defecto usa ese mismo valor. |
| `TARGET_NAME` | No | Nombre del target en MongoDB que debe usar el servidor pescador. Si no se especifica, usa el primer target disponible. Si se especifica un nombre que no existe en la base de datos, el proceso termina con error. |

### Ejemplo de uso

```bash
export TARGET_URL="https://example.com"
export TARGET_LANGUAGE="es-419,es;q=0.9,en;q=0.8"   # opcional
export TARGET_NAME="mi-target"                         # opcional

    # elimina los anónimos viejos (~1GB)
docker compose down && docker volume prune -f && docker compose up -d && docker compose logs debug-server pescador  -f
```

O con un archivo `.env` en la raíz del proyecto:

```env
TARGET_URL=https://example.com
TARGET_LANGUAGE=es-419,es;q=0.9,en;q=0.8
TARGET_NAME=mi-target
```

## Flujo de arranque

1. `entrypoint.sh` detecta si `TARGET_URL` está definida.
2. Si lo está, ejecuta `add_target.js` para guardar el target en MongoDB.
3. Una vez guardado, arranca `index.js` (servidor Fastify + Socket.IO).
4. El servidor carga el target indicado por `TARGET_NAME` (o el primero disponible) y abre el navegador headless apuntando a él.

## Panel de administración

Accesible en `https://pescador.x1-x.com/admin`.

Requiere que tu IP esté en la lista `admin_ips` de [pescador/config.json](pescador/config.json).

## Servicios

| Servicio | Puerto interno | Descripción |
|----------|---------------|-------------|
| `caddy` | 80 / 443 | Reverse proxy y terminación TLS |
| `pescador` | 58082 | Servidor principal (Fastify + Puppeteer) |
| `browser-front` | 3001 | Frontend del panel de control |
| `debug-server` | 8081 | Servidor de eventos de navegación |
| `mongodb` | 27017 | Base de datos |
