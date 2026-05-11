import { Hono } from "hono";
import { ConfigManager } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { TokenManager } from "../core/TokenManager";
import { authMiddleware } from "../middleware/auth";
import { GenericProvider } from "../providers/GenericProvider";

const apiRoutes = new Hono({ strict: false });

apiRoutes.use("*", authMiddleware);

apiRoutes.get("/status", async (c) => {
	const configManager = new ConfigManager(redis);
	const providers = await configManager.getAllProviders();
	const status: Record<string, { accessToken: string | null; refreshToken: string | null }> = {};

	for (const provider of Object.keys(providers)) {
		const accessToken = await redis.get(`provider:${provider}:access_token`);
		const refreshToken = await redis.get(`provider:${provider}:refresh_token`);
		const lastUpdated = await redis.get(`provider:${provider}:last_updated`);
		status[provider] = { accessToken, refreshToken, lastUpdated } as any;
	}

	return c.json(status);
});

apiRoutes.get("/token/:provider", async (c) => {
	const providerName = c.req.param("provider");
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
	return c.json({ access_token: accessToken });
});

apiRoutes.post("/refresh/:provider", async (c) => {
	const providerName = c.req.param("provider");
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

	return c.json({
		success: true,
		status: { accessToken, refreshToken, lastUpdated },
	});
});

export { apiRoutes };
