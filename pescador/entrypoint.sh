#!/bin/bash

export DISPLAY=:99

# Limpiar lock de Xvfb si existe de un reinicio anterior
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true

# Iniciar Xvfb (virtual display)
Xvfb :99 -screen 0 1280x720x24 &
sleep 2

# Verificar si estamos en modo add_target o modo servidor
if [ -n "$TARGET_URL" ]; then
  echo "Running add_target.js with URL: $TARGET_URL"
  LANG_ARG="${TARGET_LANGUAGE:-es-419,es;q=0.9,en;q=0.8}"
  node add_target.js "$TARGET_URL" "$LANG_ARG" "$@"
  echo "[ENTRYPOINT] add_target.js completed, starting index.js..."
  exec node index.js "$@"
else
  # Modo servidor: leer target de MongoDB
  echo "Running index.js in server mode"
  echo "TARGET_NAME=${TARGET_NAME:-default}"
  exec node index.js "$@"
fi
