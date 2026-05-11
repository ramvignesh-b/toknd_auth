import { Hono } from "hono";
import { ConfigManager, ProviderConfigSchema } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { authMiddleware } from "../middleware/auth";

const configRoutes = new Hono();

configRoutes.use("*", authMiddleware);

configRoutes.get("/", async (c) => {
	const configManager = new ConfigManager(redis);
	const providers = await configManager.getAllProviders();
	return c.json(providers);
});

configRoutes.post("/:provider", async (c) => {
	const provider = c.req.param("provider");
	const configManager = new ConfigManager(redis);

	try {
		const body = await c.req.json();
		const validatedConfig = ProviderConfigSchema.parse(body);
		await configManager.setProviderConfig(provider, validatedConfig);
		return c.json({ message: `Config for ${provider} saved successfully` });
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ error: error.message }, 400);
		}
		return c.json({ error: "Internal Server Error" }, 500);
	}
});

export { configRoutes };
