FROM node:18

# Install the minimal tooling we need before Playwright installs browser deps.
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    wget \
    xvfb \
    x11-apps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first so Docker can cache dependency installation.
# The lockfile is copied when it is present in the build context.
COPY package*.json ./

# Install Node dependencies and the Chromium build that matches Playwright.
RUN npm install --omit=dev
RUN npx playwright install --with-deps chromium

# Copy application files.
COPY . .

RUN mkdir -p /app/user_data

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000 58082

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:58082/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["internal"]
