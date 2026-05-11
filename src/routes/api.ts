import { Hono } from "hono";
import { ConfigManager } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { TokenManager } from "../core/TokenManager";
import { authMiddleware } from "../middleware/auth";
import { GenericProvider } from "../providers/GenericProvider";

const apiRoutes = new Hono({ strict: false });

apiRoutes.use("*", authMiddleware);

apiRoutes.get("/token/:provider", async (c) => {
	const providerName = c.req.param("provider");
	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json({ error: `Provider ${providerName} not configured` }, 404);
	}

	const provider = new GenericProvider(providerName, providerConfig);
	const tokenManager = new TokenManager(redis, provider);

	try {
		const accessToken = await tokenManager.getAccessToken(providerName);
		if (!accessToken) {
			return c.json({ error: "No tokens found for provider" }, 404);
		}
		return c.json({ access_token: accessToken });
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ error: error.message }, 500);
		}
		return c.json({ error: "Internal Server Error" }, 500);
	}
});

export { apiRoutes };
