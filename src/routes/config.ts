import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ConfigManager } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { authMiddleware } from "../middleware/auth";

const configRoutes = new OpenAPIHono();

// Schemas
const ProviderConfigSpec = z
	.object({
		authUrl: z.url().openapi({ example: "https://trakt.tv/oauth/authorize" }),
		tokenUrl: z.url().openapi({ example: "https://api.trakt.tv/oauth/token" }),
		clientId: z.string().openapi({ example: "your_client_id" }),
		clientSecret: z.string().openapi({ example: "your_client_secret" }),
		scope: z.string().openapi({ example: "public" }),
		redirectUri: z.url().optional().openapi({ example: "http://localhost:3000/auth/callback" }),
	})
	.openapi("ProviderConfig");

const AllProvidersResponse = z
	.record(z.string(), ProviderConfigSpec)
	.openapi("AllProvidersResponse");

const SuccessMessage = z
	.object({
		message: z.string(),
	})
	.openapi("SuccessMessage");

const ErrorResponse = z
	.object({
		error: z.string(),
	})
	.openapi("ErrorResponse");

// Routes
const listConfigRoute = createRoute({
	method: "get",
	path: "/",
	security: [{ API_KEY: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: AllProvidersResponse } },
			description: "Retrieve all registered provider configurations",
		},
	},
});

const setConfigRoute = createRoute({
	method: "post",
	path: "/{provider}",
	security: [{ API_KEY: [] }],
	request: {
		params: z.object({
			provider: z.string().openapi({ example: "trakt" }),
		}),
		body: {
			content: { "application/json": { schema: ProviderConfigSpec } },
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: SuccessMessage } },
			description: "Save or update a provider configuration",
		},
		400: {
			content: { "application/json": { schema: ErrorResponse } },
			description: "Invalid configuration data",
		},
	},
});

const deleteConfigRoute = createRoute({
	method: "delete",
	path: "/{provider}",
	security: [{ API_KEY: [] }],
	request: {
		params: z.object({
			provider: z.string().openapi({ example: "trakt" }),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: SuccessMessage } },
			description: "Delete a provider configuration and its tokens",
		},
	},
});

// Implementations
configRoutes.use("*", authMiddleware);

configRoutes.openapi(listConfigRoute, async (c) => {
	const configManager = new ConfigManager(redis);
	const providers = await configManager.getAllProviders();
	return c.json(providers, 200);
});

configRoutes.openapi(setConfigRoute, async (c) => {
	const provider = c.req.valid("param").provider;
	const body = c.req.valid("json");
	const configManager = new ConfigManager(redis);

	await configManager.setProviderConfig(provider, body);
	return c.json({ message: `Config for ${provider} saved successfully` }, 200);
});

configRoutes.openapi(deleteConfigRoute, async (c) => {
	const provider = c.req.valid("param").provider;
	const configManager = new ConfigManager(redis);

	await configManager.deleteProviderConfig(provider);
	return c.json({ message: `Config for ${provider} deleted successfully` }, 200);
});

export { configRoutes };
