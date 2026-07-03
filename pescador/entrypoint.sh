#!/bin/bash

export DISPLAY=:99

# Iniciar Xvfb (virtual display)
Xvfb :99 -screen 0 1280x720x24 &
sleep 2

# Verificar si estamos en modo add_target o modo servidor
if [ -n "$TARGET_URL" ]; then
  echo "Running add_target.js with URL: $TARGET_URL"
  LANG_ARG="${TARGET_LANGUAGE:-es-419,es;q=0.9,en;q=0.8}"
  exec node add_target.js "$TARGET_URL" "$LANG_ARG" "$@"
else
  # Modo servidor: leer target de MongoDB
  echo "Running index.js in server mode"
  echo "TARGET_NAME=${TARGET_NAME:-default}"
  exec node index.js "$@"
fi
