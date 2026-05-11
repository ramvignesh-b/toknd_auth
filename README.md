# Auth Server

## Project Overview

The Auth Server is a centralized authentication and token management service built with Bun, Hono, and Redis. It provides a generic interface for managing OAuth2 providers, handling token exchange, storage, and automatic refresh. This service is designed to be easily extensible and can be deployed using Docker for consistent environments.

## Features

- Generic OAuth2 provider implementation.
- Automatic token refresh management.
- Centralized configuration storage in Redis.
- Secure API access via API key authentication.
- Web-based dashboard for configuration management.
- Docker and Docker Compose support for simplified deployment.
- High performance powered by Bun and Redis.

## Setup Instructions

### Docker Deployment (Recommended)

To deploy the Auth Server using Docker in production:

1. Ensure you have Docker and Docker Compose installed on your system.
2. Clone the repository and navigate to the project directory.
3. Create a `.env` file based on `.env.example` and provide your `API_KEY`.
4. Run the following command to start the services:
   ```bash
   docker-compose up -d --build
   ```
5. The application will be available at `http://localhost:3000` (or the port specified in your `.env`).

The Docker setup uses a multi-stage build for a slim production image and persistent Redis storage.

### Local Development Setup

To run the project locally without Docker:

1. Install [Bun](https://bun.sh/) on your machine.
2. Ensure you have a Redis instance running and accessible.
3. Install dependencies:
   ```bash
   bun install
   ```
4. Set up your environment variables in a `.env` file:
   ```env
   REDIS_URL=redis://localhost:6379
   API_KEY=your_secret_api_key
   ```
5. Start the development server:
   ```bash
   bun run dev
   ```

## API Documentation

All API requests except for the initial OAuth login and callback require an `Authorization` header:
`Authorization: Bearer <your_api_key>`

### Configuration API

#### Get All Providers
- **Endpoint**: `GET /api/config/`
- **Description**: Retrieves a list of all configured OAuth2 providers.

#### Set Provider Configuration
- **Endpoint**: `POST /api/config/:provider`
- **Description**: Configures or updates an OAuth2 provider.
- **Payload**:
  ```json
  {
    "clientId": "your_client_id",
    "clientSecret": "your_client_secret",
    "authUrl": "https://provider.com/oauth/authorize",
    "tokenUrl": "https://provider.com/oauth/token",
    "redirectUri": "http://localhost:3000/auth/:provider/callback",
    "scope": "scope1 scope2"
  }
  ```

### Authentication API

#### Initiate Login
- **Endpoint**: `GET /auth/:provider/login`
- **Description**: Redirects the user to the provider's authorization page.

#### OAuth Callback
- **Endpoint**: `GET /auth/:provider/callback`
- **Description**: Handles the authorization code exchange and saves the tokens.

### Token Management API

#### Get Access Token
- **Endpoint**: `GET /api/token/:provider`
- **Description**: Retrieves a valid access token for the specified provider. If the token is expired, it will be automatically refreshed using the refresh token.

## Dashboard

The service includes a basic dashboard for managing configurations:
- **URL**: `http://localhost:3000/app/`

## Extensibility Guide

To add support for a specific provider that requires custom logic beyond the generic implementation:

1. Create a new class in `src/providers/` that implements the `IOAuthProvider` interface.
2. Update the routing logic in `src/routes/` to utilize your specialized provider based on the provider name.

The generic provider implementation handles most standard OAuth2 flows out of the box.

## Development Standards

- **Runtime**: Bun 1.1+
- **Linter/Formatter**: Biome
- **Language**: TypeScript
- **Database**: Redis
