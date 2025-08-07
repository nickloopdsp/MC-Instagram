# Simple Node.js Dockerfile to avoid Nixpacks failures on Railway

FROM node:20-slim AS base
WORKDIR /app

# Install production tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  git \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Install deps separately for better caching
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source and build
COPY . .

ENV NODE_ENV=production
RUN npm run build

# Final image
FROM node:20-slim
WORKDIR /app

# Only copy needed artifacts
COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/dist ./dist
RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "dist/index.js"]


