FROM oven/bun:1.3-slim
WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

ENV NODE_ENV=production
USER bun
EXPOSE 3000

CMD ["bun", "run", "start"]
