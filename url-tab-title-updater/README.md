# Debug Server - Navigation Logging Dashboard

Standalone server para recibir, almacenar y visualizar logs de navegación con **aislación multi-usuario mediante SHA256**.

## Características

- 📡 **REST API** - Recibe logs POST en `/logs`
- 🎨 **Dashboard interactivo** - Visualiza eventos en tiempo real en `/debug`
- 🔐 **Aislación por sesión** - Cada sesión ve solo sus propios eventos
- 🔗 **WebSocket en vivo** - Socket.IO para actualizaciones en tiempo real
- 🌐 **CORS habilitado** - Acepta requests desde cualquier origen
- ❤️ **Health check** - Endpoint `/health` para monitoreo

## Instalación

```bash
npm install
```

## Configuración

1. Copia `config.json.example` a `config.json`:
```bash
cp config.json.example config.json
```

2. Edita `config.json` con tu configuración (opcional, usa defaults si no cambias):
```json
{
  "debug_server": {
    "host": "0.0.0.0",
    "port": 8081
  }
}
```

## Uso

Inicia el servidor:
```bash
npm start
```

O en desarrollo con auto-reload:
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:8081`

## API Endpoints

### POST /logs
Recibe eventos de navegación:
```bash
curl -X POST http://localhost:8081/logs \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "abc123...",
    "event_ip": "92.176.156.212",
    "event_url": "https://example.com",
    "event_title": "Page Title",
    "event_type": "NAVIGATION",
    "target": "target_id"
  }'
```

### GET /logs
Obtiene logs filtrados por sesión:
```bash
curl "http://localhost:8081/logs?session_id=abc123..."
```

### GET /debug
Abre el dashboard interactivo (HTML):
```
http://localhost:8081/debug?session_id=abc123...
```

### GET /debug (sin filtro)
Abre dashboard mostrando todas las sesiones:
```
http://localhost:8081/debug
```

### GET /client-ip
Obtiene IP del cliente:
```bash
curl http://localhost:8081/client-ip
```

### GET /health
Verifica estado del servidor:
```bash
curl http://localhost:8081/health
```

### DELETE /logs
Borra todos los logs (útil para testing):
```bash
curl -X DELETE http://localhost:8081/logs
```

## Integración con Cliente

Desde tu aplicación cliente, envía logs así:

```javascript
const sessionId = 'sha256_hash_aqui';

// Evento de navegación
fetch('https://debug.securedevwarrior.com/logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    event_ip: '92.176.156.212',
    event_url: window.location.href,
    event_title: document.title,
    event_type: 'NAVIGATION',
    target: 'target_id'
  })
});
```

## Dashboard

Accede al dashboard en:
- **General**: `http://localhost:8081/debug` - Ver todas las sesiones
- **Por sesión**: `http://localhost:8081/debug?session_id=xxx` - Ver una sesión específica

El dashboard actualiza en tiempo real vía WebSocket.

## Estructura de Logs

```javascript
{
  "timestamp": "2026-07-03T10:30:45.123Z",
  "session_id": "4942ff15d716a840469c04c5222335e0270aabe928d5fa499f0c60bccbe5ca5e",
  "event_ip": "92.176.156.212",
  "event_url": "https://example.com/page",
  "event_title": "Page Title",
  "event_type": "NAVIGATION|CLICK|POST_DATA",
  "target": "target_identifier"
}
```

## Multi-usuario (Debug)

Para simular múltiples usuarios desde la misma IP en desarrollo, usa el parámetro `?debugIp`:

```
https://localhost/pinpo.html?debugIp=1
https://localhost/pinpo.html?debugIp=2
```

Esto genera session IDs diferentes: `IP + debugIp` → SHA256

## Limitaciones

- Máximo 1000 logs almacenados en memoria
- Los logs se pierden al reiniciar el servidor
- Para persistencia, implementa almacenamiento en DB

## Development

```bash
# Ver cambios en tiempo real
npm run dev

# Ver logs de actividad
npm start 2>&1 | tee server.log
```

## License

MIT
