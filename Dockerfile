# Limper MT — Production Dockerfile for Hostinger VPS + Easypanel + GitHub Auto-Deploy
# Multi-stage Alpine build: fast, clean, zero native build tools required, runs as non-root.

FROM node:22-alpine AS builder
WORKDIR /app

# Install all dependencies (including Vite & TypeScript for frontend build)
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --no-audit --no-fund

# Copy project source and build Vite production bundle (dist/)
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production runtime dependencies (express, pg, dotenv, etc.)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy built frontend, server entrypoint, PostgreSQL schema, and seed catalog
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/src/types ./src/types

# Ensure local fallback directory exists and is owned by non-root user
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.ts"]
