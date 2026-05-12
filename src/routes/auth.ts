import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ConfigManager } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { TokenManager } from "../core/TokenManager";
import { GenericProvider } from "../providers/GenericProvider";

const authRoutes = new OpenAPIHono();

const AuthErrorResponse = z
	.object({
		error: z.string(),
		message: z.string(),
	})
	.openapi("AuthError");

// Routes
const loginRoute = createRoute({
	method: "get",
	path: "/{provider}/login",
	tags: ["Auth (Internal)"],
	summary: "Start OAuth2 flow (Managed by System)",
	request: {
		params: z.object({
			provider: z.string().openapi({ example: "trakt" }),
		}),
		query: z.object({
			tenantId: z.string().openapi({ example: "my-tenant" }),
		}),
	},
	responses: {
		302: {
			description: "Redirect to the provider's OAuth2 authorization page",
		},
		404: {
			content: { "application/json": { schema: AuthErrorResponse } },
			description: "Provider not configured",
		},
	},
});

const callbackRoute = createRoute({
	method: "get",
	path: "/callback",
	tags: ["Auth (Internal)"],
	summary: "OAuth2 callback handler (Managed by System)",
	request: {
		query: z.object({
			state: z.string().openapi({ description: "Composite state: tenantId:providerName" }),
			code: z.string().openapi({ description: "The authorization code from the provider" }),
		}),
	},
	responses: {
		302: {
			description: "Redirect to success page",
		},
		400: {
			content: { "application/json": { schema: AuthErrorResponse } },
			description: "Invalid request (missing state or code)",
		},
		404: {
			content: { "application/json": { schema: AuthErrorResponse } },
			description: "Provider configuration not found",
		},
		500: {
			content: { "application/json": { schema: AuthErrorResponse } },
			description: "Token exchange failure",
		},
	},
});

// Implementations
authRoutes.openapi(loginRoute, async (c) => {
	const providerName = c.req.valid("param").provider;
	const tenantId = c.req.valid("query").tenantId;
	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json(
			{
				error: "Configuration Not Found",
				message: `Provider '${providerName}' is not configured.`,
			},
			404,
		);
	}

	const provider = new GenericProvider(providerName, providerConfig);
	const url = new URL(c.req.url);
	const redirectUri = providerConfig.redirectUri || `${url.origin}/auth/callback`;

	// Pass both tenantId and providerName in state
	const state = `${tenantId}:${providerName}`;
	return c.redirect(provider.getAuthUrl(state, redirectUri));
});

authRoutes.openapi(callbackRoute, async (c) => {
	const { state, code } = c.req.valid("query");

	// state is expected to be "tenantId:providerName"
	const parts = state.split(":");
	if (parts.length !== 2) {
		return c.json(
			{
				error: "Invalid State",
				message: "The state parameter is invalid.",
			},
			400,
		);
	}

	const [tenantId, providerName] = parts;

	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json(
			{
				error: "Configuration Not Found",
				message: `Provider '${providerName}' is not configured.`,
			},
			404,
		);
	}

	const url = new URL(c.req.url);
	const redirectUri = providerConfig.redirectUri || `${url.origin}/auth/callback`;

	const provider = new GenericProvider(providerName, providerConfig);
	const tokenManager = new TokenManager(redis, provider);

	try {
		const tokens = await provider.exchangeCode(code, redirectUri);
		await tokenManager.saveTokens(tenantId, providerName, tokens);

		return c.redirect(`/app/success?provider=${providerName}&tenantId=${tenantId}`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
		console.error(`[OAuth Error] ${errorMessage}`);
		return c.json(
			{
				error: "Token Exchange Failed",
				message: errorMessage,
			},
			500,
		);
	}
});

export { authRoutes };
