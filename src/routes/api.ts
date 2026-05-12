import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ConfigManager } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { TokenManager } from "../core/TokenManager";
import { authMiddleware } from "../middleware/auth";
import { GenericProvider } from "../providers/GenericProvider";

const apiRoutes = new OpenAPIHono();

// Schemas
const StatusResponseSchema = z
	.record(
		z.string(),
		z.object({
			accessToken: z.string().nullable(),
			refreshToken: z.string().nullable(),
			lastUpdated: z.string().nullable(),
			expiresAt: z.string().nullable().openapi({
				example: "2026-05-12T10:00:00.000Z",
				description: "ISO timestamp of when the access token expires",
			}),
		}),
	)
	.openapi("StatusResponse");

const TokenResponseSchema = z
	.object({
		access_token: z.string(),
	})
	.openapi("TokenResponse");

const RefreshResponseSchema = z
	.object({
		success: z.boolean(),
		status: z.object({
			accessToken: z.string().nullable(),
			refreshToken: z.string().nullable(),
			lastUpdated: z.string().nullable(),
			expiresAt: z.string().nullable().openapi({
				example: "2026-05-12T10:00:00.000Z",
				description: "ISO timestamp of when the access token expires",
			}),
		}),
	})
	.openapi("RefreshResponse");

const ErrorSchema = z
	.object({
		error: z.string(),
	})
	.openapi("Error");

// Routes
const statusRoute = createRoute({
	method: "get",
	path: "/status",
	security: [{ API_KEY: [], TENANT_ID: [] }],
	tags: ["Tokens"],
	request: {
		headers: z.object({
			"x-tenant-id": z.string().openapi({ example: "my-tenant" }),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: StatusResponseSchema } },
			description: "Retrieve the status of all configured providers",
		},
	},
});

const tokenRoute = createRoute({
	method: "get",
	path: "/token/{provider}",
	security: [{ API_KEY: [], TENANT_ID: [] }],
	tags: ["Tokens"],
	request: {
		params: z.object({
			provider: z.string().openapi({ example: "trakt" }),
		}),
		headers: z.object({
			"x-tenant-id": z.string().openapi({ example: "my-tenant" }),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: TokenResponseSchema } },
			description: "Retrieve a valid access token for a specific provider",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Provider not configured or tokens not found",
		},
	},
});

const refreshRoute = createRoute({
	method: "post",
	path: "/refresh/{provider}",
	security: [{ API_KEY: [], TENANT_ID: [] }],
	tags: ["Tokens"],
	request: {
		params: z.object({
			provider: z.string().openapi({ example: "trakt" }),
		}),
		headers: z.object({
			"x-tenant-id": z.string().openapi({ example: "my-tenant" }),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: RefreshResponseSchema } },
			description: "Manually force a token refresh for a specific provider",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Provider not configured",
		},
	},
});

// Implementations
apiRoutes.use("*", authMiddleware);

apiRoutes.openapi(statusRoute, async (c) => {
	const tenantId = c.req.valid("header")["x-tenant-id"];
	const configManager = new ConfigManager(redis);
	const providers = await configManager.getAllProviders();
	const status: z.infer<typeof StatusResponseSchema> = {};

	for (const provider of Object.keys(providers)) {
		const baseKey = `tenant:${tenantId}:provider:${provider}`;
		const accessToken = await redis.get(`${baseKey}:access_token`);
		const refreshToken = await redis.get(`${baseKey}:refresh_token`);
		const lastUpdated = await redis.get(`${baseKey}:last_updated`);
		const expiresAt = await redis.get(`${baseKey}:expires_at`);
		status[provider] = { accessToken, refreshToken, lastUpdated, expiresAt };
	}

	return c.json(status, 200);
});

apiRoutes.openapi(tokenRoute, async (c) => {
	const providerName = c.req.valid("param").provider;
	const tenantId = c.req.valid("header")["x-tenant-id"];
	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json({ error: `Provider ${providerName} not configured` }, 404);
	}

	const provider = new GenericProvider(providerName, providerConfig);
	const tokenManager = new TokenManager(redis, provider);

	const accessToken = await tokenManager.getAccessToken(tenantId, providerName);
	if (!accessToken) {
		return c.json({ error: "No tokens found for provider" }, 404);
	}
	return c.json({ access_token: accessToken }, 200);
});

apiRoutes.openapi(refreshRoute, async (c) => {
	const providerName = c.req.valid("param").provider;
	const tenantId = c.req.valid("header")["x-tenant-id"];
	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json({ error: `Provider ${providerName} not configured` }, 404);
	}

	const provider = new GenericProvider(providerName, providerConfig);
	const tokenManager = new TokenManager(redis, provider);

	await tokenManager.refreshAccessToken(tenantId, providerName);
	const baseKey = `tenant:${tenantId}:provider:${providerName}`;
	const accessToken = await redis.get(`${baseKey}:access_token`);
	const refreshToken = await redis.get(`${baseKey}:refresh_token`);
	const lastUpdated = await redis.get(`${baseKey}:last_updated`);
	const expiresAt = await redis.get(`${baseKey}:expires_at`);

	return c.json(
		{
			success: true,
			status: { accessToken, refreshToken, lastUpdated, expiresAt },
		},
		200,
	);
});

export { apiRoutes };
