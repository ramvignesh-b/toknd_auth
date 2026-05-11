# Stage 1: Base
FROM oven/bun:1.1-slim as base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

ENV NODE_ENV=production

USER bun
EXPOSE 3000
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
