import { Hono } from "hono";
import { ConfigManager } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { TokenManager } from "../core/TokenManager";
import { GenericProvider } from "../providers/GenericProvider";

const authRoutes = new Hono();

authRoutes.get("/:provider/login", async (c) => {
	const providerName = c.req.param("provider");
	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json({ error: `Provider ${providerName} not configured` }, 404);
	}

	const provider = new GenericProvider(providerName, providerConfig);
	return c.redirect(provider.getAuthUrl());
});

authRoutes.get("/:provider/callback", async (c) => {
	const providerName = c.req.param("provider");
	const code = c.req.query("code");

	if (!code) {
		return c.json({ error: "Missing authorization code" }, 400);
	}

	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json({ error: `Provider ${providerName} not configured` }, 404);
	}

	const provider = new GenericProvider(providerName, providerConfig);
	const tokenManager = new TokenManager(redis, provider);

	try {
		const tokens = await provider.exchangeCode(code);
		await tokenManager.saveTokens(providerName, tokens);
		return c.json({
			message: "Successfully authenticated",
			provider: providerName,
		});
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ error: error.message }, 500);
		}
		return c.json({ error: "Internal Server Error" }, 500);
	}
});

export { authRoutes };
