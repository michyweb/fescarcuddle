import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';

let config = {
  debug_server: {
    host: '127.0.0.1',
    port: 8081
  }
};

// Leer config desde pm.json si existe
try {
  const pmPath = path.join(process.cwd(), 'pm.json');
  const pmData = JSON.parse(fs.readFileSync(pmPath, 'utf8'));
  if (pmData.debug_server) {
    config.debug_server = pmData.debug_server;
  }
  console.log('✅ Configuración cargada desde pm.json');
} catch (err) {
  console.log('⚠️  pm.json no encontrado, usando valores por defecto');
}

const fastify = Fastify({ logger: false });

// Set para almacenar conexiones Socket.IO activas
const socketClients = new Set();

// Almacenar logs en memoria
let logs = [];
const MAX_LOGS = 1000; // Máximo de logs guardados

// Endpoint para recibir logs de navegación
fastify.post('/logs', async (request, reply) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...request.body
  };
  
  logs.push(logEntry);
  
  // Mantener máximo de logs
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  console.log(`[${logEntry.timestamp}] NAVIGATION: ${logEntry.event_ip} -> ${logEntry.event_url} (${logEntry.event_title})`);
  
  // Enviar a todos los clientes Socket.IO
  socketClients.forEach(socket => {
    try {
      socket.emit('log', logEntry);
    } catch (err) {
      console.error('Error enviando a Socket.IO:', err.message);
      socketClients.delete(socket);
    }
  });
  
  reply.send({ status: 'ok', received: true });
});

// Endpoint para obtener todos los logs (JSON)
fastify.get('/logs', async (request, reply) => {
  reply.header('Content-Type', 'application/json');
  return logs;
});

// Endpoint para limpiar logs
fastify.delete('/logs', async (request, reply) => {
  logs = [];
  reply.send({ status: 'cleared', message: 'All logs deleted' });
});

// Endpoint web para visualizar logs en HTML
fastify.get('/debug', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>URL Navigation Debug</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Courier New', monospace;
          background: #1e1e1e;
          color: #d4d4d4;
          margin: 0;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #007acc;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          color: #4ec9b0;
        }
        .stats {
          color: #ce9178;
          font-size: 14px;
        }
        .controls {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        button {
          background: #007acc;
          color: white;
          border: none;
          padding: 8px 15px;
          cursor: pointer;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        button:hover {
          background: #0098ff;
        }
        button.danger {
          background: #d16969;
        }
        button.danger:hover {
          background: #ff4444;
        }
        .log-entry {
          background: #252526;
          border-left: 4px solid #007acc;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 4px;
          overflow-x: auto;
        }
        .log-entry:hover {
          background: #2d2d30;
          border-left-color: #4ec9b0;
        }
        .timestamp {
          color: #858585;
          font-size: 12px;
        }
        .ip {
          color: #ce9178;
        }
        .target {
          color: #9cdcfe;
        }
        .url {
          color: #4ec9b0;
          word-break: break-all;
          margin-top: 5px;
        }
        .event-type {
          color: #dcdcaa;
          font-weight: bold;
        }
        .empty {
          text-align: center;
          color: #858585;
          padding: 40px;
        }
        #logs-container {
          max-height: 80vh;
          overflow-y: auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔍 URL Navigation Debug</h1>
        <div class="stats">
          Total logs: <span id="log-count">${logs.length}</span>
        </div>
      </div>
      
      <div class="controls">
        <button onclick="refreshLogs()">🔄 Refresh</button>
        <button class="danger" onclick="clearLogs()">🗑️ Clear All</button>
        <button onclick="toggleAutoRefresh()">⏱️ Auto-Refresh (OFF)</button>
      </div>
      
      <div id="logs-container">
        ${logs.length === 0 
          ? '<div class="empty">Waiting for navigation events...</div>' 
          : logs.map((log, idx) => `
          <div class="log-entry">
            <div>
              <span class="timestamp">${log.timestamp}</span>
              <span class="event-type">[${log.event_type}]</span>
              <span class="ip">${log.event_ip}</span>
              <span class="target">@${log.target}</span>
            </div>
            <div class="url">📍 <strong>${log.event_url || log.event_data || 'N/A'}</strong></div>
            <div style="color: #ce9178; margin-top: 8px; font-size: 13px; padding: 6px; background: #1e1e1e; border-radius: 3px;">📄 <strong>${log.event_title || '(sin título)'}</strong></div>
          </div>
        `).join('')
        }
      </div>
      
      <script>
        let autoRefresh = false;
        let refreshInterval = null;
        
        function refreshLogs() {
          location.reload();
        }
        
        function clearLogs() {
          if (confirm('¿Estás seguro? Esto eliminará todos los logs.')) {
            fetch('/logs', { method: 'DELETE' }).then(() => location.reload());
          }
        }
        
        function toggleAutoRefresh() {
          autoRefresh = !autoRefresh;
          if (autoRefresh) {
            refreshInterval = setInterval(() => location.reload(), 2000);
            alert('Auto-refresh habilitado (cada 2s)');
          } else {
            clearInterval(refreshInterval);
            alert('Auto-refresh deshabilitado');
          }
        }
      </script>
    </body>
    </html>
  `;
  
  return html;
});

// Socket.IO para conexiones en tiempo real
fastify.ready(() => {
  const io = new Server(fastify.server, {
    cors: { origin: '*' }
  });
  
  io.on('connection', (socket) => {
    console.log(`📡 Cliente Socket.IO conectado: ${socket.id} desde ${socket.handshake.address}`);
    socketClients.add(socket);
    
    // Enviar logs existentes al cliente que se conecta
    socket.emit('initial_logs', logs);
    
    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`❌ Cliente Socket.IO desconectado: ${socket.id}`);
      socketClients.delete(socket);
    });
    
    // Manejar errores
    socket.on('error', (err) => {
      console.error('Error en Socket.IO:', err.message);
      socketClients.delete(socket);
    });
  });
  
  // Guardar referencia al io en fastify
  fastify.io = io;
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', uptime: process.uptime(), logs: logs.length };
});

// Iniciar servidor
const start = async () => {
  try {
    const { host, port } = config.debug_server;
    await fastify.listen({ port, host });
    
    const baseUrl = `http://${host}:${port}`;
    console.log(`🚀 Debug Server escuchando en ${baseUrl}`);
    console.log(`   📊 Visualizar logs: ${baseUrl}/debug`);
    console.log(`   📡 Recibir POSTs en: ${baseUrl}/logs`);
    console.log(`   🔌 Socket.IO en tiempo real: ${baseUrl} (socket.io/)`);
    console.log(`   ✅ Health check: ${baseUrl}/health`);
    console.log(`   🔍 Ver JSON: ${baseUrl}/logs`);
  } catch (err) {
    console.error('❌ Error al iniciar servidor:');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

start();
