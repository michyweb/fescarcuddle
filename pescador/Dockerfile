FROM node:18

# Instalar dependencias del sistema para Puppeteer y Xvfb
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    x11-apps \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    libxrender1 \
    libnss3 \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependencias de Node (solo producción)
RUN npm install --omit=dev

# Copiar todos los archivos de la aplicación (respeta .dockerignore)
COPY . .

# Crear directorio para datos de usuario
RUN mkdir -p /app/user_data

# Copiar script de inicio
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Exponer puertos
EXPOSE 3000 58082

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:58082/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["internal"]
