# toknd — Auth Broker
![Dashboard Screenshot](.docs/screenshot.png)

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

## Getting Started

toknd can be deployed either as a containerized service or self-hosted directly on your hardware.

### 1. Environment Setup
Clone the repository and create your environment file:
```bash
cp .env.example .env
```
Define a strong `API_KEY` and ensure `REDIS_URL` points to a valid Redis instance.

### 2. Choose Deployment Method

#### Option A: Containerized (Recommended)
This is the easiest way to get up and running, as it bundles the application and a Redis instance together.

- **Development (with Hot-Reload)**:
  ```bash
  podman compose up --build
  ```
- **Production**:
  ```bash
  docker compose up -d --build
  ```

#### Option B: Self-Hosting (Bare Metal)
Ideal for lightweight deployments or custom environments where you already have Bun and Redis.

1. **Install Dependencies**:
   ```bash
   bun install
   ```
2. **Start the Server**:
   - **Development**: `bun run dev` (with hot-reload)
   - **Production**: `bun run start`
   *Note: Ensure your Redis server is running and accessible via the `REDIS_URL` in your `.env`.*

---

## API Reference

toknd provides a built-in **Scalar API Reference** that allows you to explore and test all endpoints directly from your browser.

- **Interactive UI**: [http://localhost:3000/api](http://localhost:3000/api) (or `/docs`)
- **OpenAPI Spec (JSON)**: [http://localhost:3000/doc](http://localhost:3000/doc)

All protected endpoints require a Bearer token in the `Authorization` header:
`Authorization: Bearer <your_master_api_key>`

### Core Concepts
- **Token Brokerage**: Automated access token retrieval and background refreshes for all configured providers.
- **Provider Management**: Register and manage OAuth2 providers via the Dashboard or the configuration API.

## Dashboard
Access the **toknd** dashboard at:
`http://localhost:3000/app`

The dashboard allows you to manage provider configurations, view live token statuses, and manually trigger refreshes. Authenticate using your **Master API Key**.

---
