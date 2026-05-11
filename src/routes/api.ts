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
	security: [{ API_KEY: [] }],
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
	security: [{ API_KEY: [] }],
	request: {
		params: z.object({
			provider: z.string().openapi({ example: "trakt" }),
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
	security: [{ API_KEY: [] }],
	request: {
		params: z.object({
			provider: z.string().openapi({ example: "trakt" }),
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
	const configManager = new ConfigManager(redis);
	const providers = await configManager.getAllProviders();
	const status: z.infer<typeof StatusResponseSchema> = {};

	for (const provider of Object.keys(providers)) {
		const accessToken = await redis.get(`provider:${provider}:access_token`);
		const refreshToken = await redis.get(`provider:${provider}:refresh_token`);
		const lastUpdated = await redis.get(`provider:${provider}:last_updated`);
		status[provider] = { accessToken, refreshToken, lastUpdated };
	}

	return c.json(status, 200);
});

apiRoutes.openapi(tokenRoute, async (c) => {
	const providerName = c.req.valid("param").provider;
	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json({ error: `Provider ${providerName} not configured` }, 404);
	}

	const provider = new GenericProvider(providerName, providerConfig);
	const tokenManager = new TokenManager(redis, provider);

	const accessToken = await tokenManager.getAccessToken(providerName);
	if (!accessToken) {
		return c.json({ error: "No tokens found for provider" }, 404);
	}
	return c.json({ access_token: accessToken }, 200);
});

apiRoutes.openapi(refreshRoute, async (c) => {
	const providerName = c.req.valid("param").provider;
	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json({ error: `Provider ${providerName} not configured` }, 404);
	}

	const provider = new GenericProvider(providerName, providerConfig);
	const tokenManager = new TokenManager(redis, provider);

	await tokenManager.refreshAccessToken(providerName);
	const accessToken = await redis.get(`provider:${providerName}:access_token`);
	const refreshToken = await redis.get(`provider:${providerName}:refresh_token`);
	const lastUpdated = await redis.get(`provider:${providerName}:last_updated`);

	return c.json(
		{
			success: true,
			status: { accessToken, refreshToken, lastUpdated },
		},
		200,
	);
});

export { apiRoutes };
