#!/bin/sh
# Injects PORT and BACKEND_URL into nginx config at container startup,
# then starts nginx. Required because Cloud Run injects PORT dynamically.

set -e

: "${PORT:=8080}"
: "${BACKEND_URL:=http://localhost:8000}"

echo "[docker-entrypoint.sh] Configuring nginx on port $PORT with backend $BACKEND_URL"

# envsubst replaces ${PORT} and ${BACKEND_URL} in the template
envsubst '${PORT} ${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
