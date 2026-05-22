# Use Node.js 18 alpine image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (devDependencies include Vite, TypeScript, etc needed for build)
RUN npm ci

# Copy source code and build
# VITE_API_BASE_URL must be passed as a build arg so it's baked into the JS bundle
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

# ── Production stage ───────────────────────────────────────────────────────────
FROM nginx:alpine

# Install envsubst (part of gettext) for runtime config templating
RUN apk add --no-cache gettext

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template (not the static conf — it gets generated at startup)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy startup script that injects env vars into nginx config
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Cloud Run injects PORT at runtime
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:${PORT:-8080}/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
