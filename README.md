# toknd — Auth Broker

**toknd** is a minimal, centralized authentication and token broker. Built with **Bun**, **Hono**, and **Redis**, it serves as a middleware layer that manages OAuth2 providers, token persistence, and automatic refreshes, allowing your applications to focus on their core logic.

## Features

- Centralized management for multiple OAuth2 providers (Google, Trakt, GitHub, etc.).
- Automatic token refreshes.
- Secure and isolated API access via API key authentication.
- Web-based dashboard for configuration management.
- Docker Compose support for simplified deployment.
- High performance and low-latency powered by Bun and Redis.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Web Framework**: [Hono](https://hono.dev/)
- **Data Store**: Redis
- **Styling**: Tailwind CSS & DaisyUI
- **Schema & Validation**: Zod

## Quick Start

### 1. Environment Setup
Clone the repository and create your environment file:
```bash
cp .env.example .env
```
Ensure you define a strong `API_KEY` in your `.env`.

### 2. Local Development (with Auto-Watch)
We use a Docker Compose override system to enable hot-reloading locally:
```bash
podman compose up --build
```
*Note: This mounts your ./src directory into the container and uses bun --hot to restart on any code changes.*

### 3. Production Deployment
For production, only the core docker-compose.yml is used:
```bash
docker compose up -d --build
```

## API Reference

All protected endpoints require an Authorization header:
`Authorization: Bearer <your_master_api_key>`

### Token Brokerage
- **Get Valid Token**: `GET /api/token/:provider`
  - Returns a valid access token. Automatically triggers a refresh if the current one is expired.
- **Registry Status**: `GET /api/status`
  - Returns the connectivity and refresh status of all configured providers.

### Authentication Flow
1. **Initiate**: `GET /auth/:provider/login`
2. **Callback**: `GET /auth/callback` (Handled internally by toknd)

## Dashboard
Access the toknd dashboard at:
`http://localhost:3000/app`

Authenticate the registry using your Master API Key to manage your providers and view live token status.

---

