import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { ConfigManager } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { TokenManager } from "../core/TokenManager";
import { GenericProvider } from "../providers/GenericProvider";

const authRoutes = new Hono({ strict: false });

authRoutes.get("/:provider/login", async (c) => {
	const providerName = c.req.param("provider");
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

authRoutes.get("/callback", async (c) => {
	const providerName = c.req.query("state");
	const code = c.req.query("code");

	if (!providerName || !code) {
		return c.json(
			{
				error: "Invalid Request",
				message: "Missing state (provider) or authorization code.",
			},
			400,
		);
	}

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
