FROM oven/bun:1.3-slim
WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

ENV NODE_ENV=production
USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(res => res.ok ? process.exit(0) : process.exit(1)).catch(e => process.exit(1))"

CMD ["bun", "run", "start"]
