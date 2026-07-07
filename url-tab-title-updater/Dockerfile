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

# Comando de inicio
CMD ["npm", "start"]
