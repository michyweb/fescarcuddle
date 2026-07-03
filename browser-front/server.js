import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Middleware: servir archivos estáticos
app.use(express.static(__dirname));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all para index.html
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Browser Front escuchando en http://0.0.0.0:${PORT}`);
  console.log(`📱 Detección client-side:`);
  console.log(`   - OS: Windows o MacOS`);
  console.log(`   - Dark Mode: matchMedia`);
  console.log(`   - Redirigida automáticamente a carpeta correspondiente`);
});
