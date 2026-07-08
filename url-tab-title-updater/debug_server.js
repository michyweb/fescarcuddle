import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';

let config = {
  debug_server: {
    host: '127.0.0.1',
    port: 8081
  }
};

// Leer config desde config.json si existe
try {
  const configPath = path.join(process.cwd(), 'config.json');
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (configData.debug_server) {
    config.debug_server = configData.debug_server;
  }
  console.log('✅ Configuración cargada desde config.json');
} catch (err) {
  console.log('⚠️  config.json no encontrado, usando valores por defecto');
}

const fastify = Fastify({ logger: false });

// Registrar CORS plugin para todos los endpoints
fastify.register(fastifyCors, {
  origin: '*'
});

// Set para almacenar conexiones Socket.IO activas
const socketClients = new Set();
const activeSessionSockets = new Map();
const duplicateRejectLogState = new Map();
const DUPLICATE_REJECT_LOG_INTERVAL_MS = 30000;

function getSocketSessionKey(socket, sessionId) {
  if (!sessionId) {
    return '';
  }
  return `${sessionId}:${socket.handshake.address}`;
}

function getDuplicateRejectLogSuffix(key) {
  const now = Date.now();
  const rejectState = duplicateRejectLogState.get(key) || { lastLogAt: 0, suppressed: 0 };
  if (now - rejectState.lastLogAt >= DUPLICATE_REJECT_LOG_INTERVAL_MS) {
    const suffix = rejectState.suppressed > 0 ? ` (${rejectState.suppressed} duplicados silenciados)` : '';
    rejectState.lastLogAt = now;
    rejectState.suppressed = 0;
    duplicateRejectLogState.set(key, rejectState);
    return suffix;
  }

  rejectState.suppressed += 1;
  duplicateRejectLogState.set(key, rejectState);
  return null;
}

function reserveSessionSocket(socket, sessionId) {
  const key = getSocketSessionKey(socket, sessionId);
  if (!key) {
    return;
  }

  socket.data.sessionKey = key;
  socket.data.sessionId = sessionId;
  activeSessionSockets.set(key, socket);
}

function replacePreviousSessionSocket(socket, sessionId) {
  const key = getSocketSessionKey(socket, sessionId);
  if (!key) {
    return null;
  }

  const previousSocket = activeSessionSockets.get(key);
  if (previousSocket && previousSocket.id !== socket.id && previousSocket.connected) {
    const suffix = getDuplicateRejectLogSuffix(key);
    if (suffix !== null) {
      console.warn(`ℹ️ Detectado socket adicional ${socket.id} para session ${sessionId.substring(0, 8)}... (socket previo ${previousSocket.id}) desde ${socket.handshake.address}${suffix}`);
    }
    return previousSocket;
  }

  return null;
}

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
  
  console.log(`[${logEntry.timestamp}] NAVIGATION | Session: ${logEntry.session_id?.substring(0, 8)}... | IP: ${logEntry.event_ip} | URL: ${logEntry.event_url} | Title: ${logEntry.event_title} | Favicon: ${logEntry.event_favicon || 'N/A'}`);  
  // Enviar a los clientes Socket.IO de esta sesión
  if (logEntry.session_id) {
    // Emitir SOLO a clientes en la room de este session_id
    fastify.io.to(logEntry.session_id).emit('log', logEntry);
  } else {
    // ERROR: Log sin session_id no debe emitirse a nadie
    console.warn(`⚠️  [${logEntry.timestamp}] Log recibido SIN session_id - DESCARTADO. Data: ${JSON.stringify(logEntry).substring(0, 100)}`);
  }
  
  reply.send({ status: 'ok', received: true });
});

// Endpoint para obtener logs filtrados por session_id o todos (JSON)
fastify.get('/logs', async (request, reply) => {
  reply.header('Content-Type', 'application/json');
  const sessionId = request.query.session_id;
  
  if (sessionId) {
    // Filtrar solo logs del session_id especificado
    return logs.filter(log => log.session_id === sessionId);
  }
  
  // Si no hay session_id, devolver todos (compatibilidad hacia atrás)
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
  
  // Filtrar por session_id si se proporciona
  const sessionId = request.query.session_id;
  const filteredLogs = sessionId 
    ? logs.filter(log => log.session_id === sessionId)
    : logs;
  
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
          Total logs: <span id="log-count">${filteredLogs.length}</span>
          ${sessionId ? ` | 🔐 Session: <code>${sessionId}</code>` : ''}
        </div>
      </div>
      
      <div class="controls">
        <button onclick="refreshLogs()">🔄 Refresh</button>
        <button class="danger" onclick="clearLogs()">🗑️ Clear All</button>
        <button onclick="toggleAutoRefresh()">⏱️ Auto-Refresh (OFF)</button>
      </div>
      
      <div id="logs-container">
        ${filteredLogs.length === 0 
          ? '<div class="empty">Waiting for navigation events...</div>' 
          : filteredLogs.map((log, idx) => `
          <div class="log-entry">
            <div>
              <span class="timestamp">${log.timestamp}</span>
              <span class="event-type">[${log.event_type}]</span>
              <span class="ip">${log.event_ip}</span>
              <span class="target">@${log.target}</span>
            </div>
            <div class="url">📍 <strong>${log.event_url || log.event_data || 'N/A'}</strong></div>
            <div style="color: #ce9178; margin-top: 8px; font-size: 13px; padding: 6px; background: #1e1e1e; border-radius: 3px; display: flex; align-items: center; gap: 8px;">${log.event_favicon ? `<img src="${log.event_favicon}" style="width:16px;height:16px;object-fit:contain;" onerror="this.style.display='none'">` : '📄'} <strong>${log.event_title || '(sin título)'}</strong></div>
            <div style="color: #858585; margin-top: 6px; font-size: 11px; font-family: monospace;">🔐 <strong>${(log.session_id || 'no-session').substring(0, 8)}...</strong>${log.event_favicon ? ` | 🖼️ <a href="${log.event_favicon}" target="_blank" style="color:#858585;">${log.event_favicon}</a>` : ''}</div>
          </div>
        `).join('')
        }
      </div>
      
      <script src="/socket.io/socket.io.js"></script>
      <script>
        let autoRefresh = false;
        let refreshInterval = null;
        const sessionId = '${sessionId}';
        
        // Conectar a Socket.IO con session_id en el handshake
        const socket = io(window.location.origin, {
          auth: {
            sessionId
          }
        });
        
        // Recibir logs en tiempo real
        socket.on('log', function(logEntry) {
          const container = document.getElementById('logs-container');
          const empty = container.querySelector('.empty');
          if (empty) empty.remove();

          const faviconHtml = logEntry.event_favicon
            ? '<img src="' + logEntry.event_favicon + '" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;" onerror="this.style.display=&quot;none&quot;">'
            : '📄';
          const faviconLink = logEntry.event_favicon
            ? ' | 🖼️ <a href="' + logEntry.event_favicon + '" target="_blank" style="color:#858585;">' + logEntry.event_favicon + '</a>'
            : '';

          const entry = document.createElement('div');
          entry.className = 'log-entry';
          entry.innerHTML =
            '<div>' +
              '<span class="timestamp">' + logEntry.timestamp + '</span> ' +
              '<span class="event-type">[' + logEntry.event_type + ']</span> ' +
              '<span class="ip">' + logEntry.event_ip + '</span> ' +
              '<span class="target">@' + logEntry.target + '</span>' +
            '</div>' +
            '<div class="url">📍 <strong>' + (logEntry.event_url || logEntry.event_data || 'N/A') + '</strong></div>' +
            '<div style="color:#ce9178;margin-top:8px;font-size:13px;padding:6px;background:#1e1e1e;border-radius:3px;display:flex;align-items:center;gap:8px;">' +
              faviconHtml + ' <strong>' + (logEntry.event_title || '(sin título)') + '</strong>' +
            '</div>' +
            '<div style="color:#858585;margin-top:6px;font-size:11px;font-family:monospace;">' +
              '🔐 <strong>' + (logEntry.session_id || 'no-session').substring(0, 8) + '...</strong>' + faviconLink +
            '</div>';

          container.prepend(entry);
          const countEl = document.getElementById('log-count');
          if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
        });
        
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
    const sessionId = socket.handshake.auth?.sessionId || socket.handshake.query?.session_id || '';
    const transport = socket.conn?.transport?.name || 'unknown';

    replacePreviousSessionSocket(socket, sessionId);

    reserveSessionSocket(socket, sessionId);
    console.log(`📡 Cliente Socket.IO conectado: ${socket.id} desde ${socket.handshake.address} (transport=${transport})`);
    socketClients.add(socket);

    if (sessionId) {
      socket.join(sessionId);
      socket.emit('initial_logs', logs.filter((log) => log.session_id === sessionId));
      console.log(`✅ Socket ${socket.id} unido a room (session): ${sessionId.substring(0, 8)}...`);
    } else {
      socket.emit('initial_logs', logs);
    }
    
    // Listener para que el cliente declare su session_id y se una a la room (opcional, por compatibilidad)
    socket.on('join_session', (session_id) => {
      replacePreviousSessionSocket(socket, session_id);
      reserveSessionSocket(socket, session_id);
      socket.join(session_id);
      console.log(`✅ Socket ${socket.id} unido a room (session): ${session_id.substring(0, 8)}...`);
    });
    
    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`❌ Cliente Socket.IO desconectado: ${socket.id}`);
      socketClients.delete(socket);
      if (socket.data.sessionKey && activeSessionSockets.get(socket.data.sessionKey)?.id === socket.id) {
        activeSessionSockets.delete(socket.data.sessionKey);
      }
    });
    
    // Manejar errores
    socket.on('error', (err) => {
      console.error('Error en Socket.IO:', err.message);
      socketClients.delete(socket);
      if (socket.data.sessionKey && activeSessionSockets.get(socket.data.sessionKey)?.id === socket.id) {
        activeSessionSockets.delete(socket.data.sessionKey);
      }
    });
  });
  
  // Guardar referencia al io en fastify
  fastify.io = io;
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', uptime: process.uptime(), logs: logs.length };
});

// Endpoint para obtener la IP del cliente
fastify.options('/client-ip', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
  reply.code(200).send();
});

fastify.get('/client-ip', async (request, reply) => {
  let clientIp = request.headers['x-real-ip'] 
    || request.headers['x-forwarded-for']?.split(',')[0]
    || request.ip;
  
  // Aplicar debug suffix de URL si se proporciona
  const debugIp = request.query.debugIp || '';
  if (debugIp) {
    clientIp = clientIp + debugIp;
  }
  
  console.log(`[CLIENT-IP] Returned IP: ${clientIp} (debugIp: ${debugIp})`);
  
  // Agregar headers CORS explícitamente
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
  reply.header('Content-Type', 'application/json');
  
  return { 
    ip: clientIp,
    timestamp: new Date().toISOString()
  };
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
