import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.static(__dirname));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/invitacion', (req, res) => {
  res.sendFile(path.join(__dirname, 'invitacion.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Example page escuchando en http://0.0.0.0:${PORT}`);
});
