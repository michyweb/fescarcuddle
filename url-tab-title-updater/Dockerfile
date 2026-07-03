FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependencias (solo producción)
RUN npm install --omit=dev

# Copiar todos los archivos (respeta .dockerignore)
COPY . .

# Crear directorio para config runtime
RUN mkdir -p /app/config

# Exponer puerto por defecto
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8081/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando de inicio
CMD ["npm", "start"]
