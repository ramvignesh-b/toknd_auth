FROM oven/bun:1.1-slim
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock* ./

# Install dependencies, ignoring scripts (like Husky) which fail without .git
RUN bun install --frozen-lockfile --ignore-scripts

# Copy the rest of the application
COPY . .

ENV NODE_ENV=production
USER bun
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
