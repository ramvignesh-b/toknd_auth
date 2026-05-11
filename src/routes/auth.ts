import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
	request: {
		params: z.object({
			provider: z.string().openapi({ example: "trakt" }),
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
	request: {
		query: z.object({
			state: z
				.string()
				.openapi({ description: "The provider name (passed as state during login)" }),
			code: z.string().openapi({ description: "The authorization code from the provider" }),
		}),
	},
	responses: {
		200: {
			description: "Success page indicating successful token exchange",
			content: { "text/html": { schema: { type: "string" } } },
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

	return c.redirect(provider.getAuthUrl(providerName, redirectUri));
});

authRoutes.openapi(callbackRoute, async (c) => {
	const { state: providerName, code } = c.req.valid("query");

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
		await tokenManager.saveTokens(providerName, tokens);

		const htmlPath = join(process.cwd(), "src/views/success.html");
		let html = await readFile(htmlPath, "utf-8");
		html = html.replaceAll("__PROVIDER_NAME__", providerName);
		return c.html(html);
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
