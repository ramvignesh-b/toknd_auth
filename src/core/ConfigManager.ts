import type { Redis } from "ioredis";
import { z } from "zod";

export const ProviderConfigSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
	redirectUri: z.string().url(),
	authUrl: z.string().url(),
	tokenUrl: z.string().url(),
	scope: z.string(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export class ConfigManager {
	constructor(private redis: Redis) {}

	async setProviderConfig(provider: string, config: ProviderConfig): Promise<void> {
		const validatedConfig = ProviderConfigSchema.parse(config);
		await this.redis.set(`config:${provider}`, JSON.stringify(validatedConfig));
	}

	async getProviderConfig(provider: string): Promise<ProviderConfig | null> {
		const data = await this.redis.get(`config:${provider}`);
		if (!data) return null;
		return ProviderConfigSchema.parse(JSON.parse(data));
	}

	async getAllProviders(): Promise<Record<string, ProviderConfig>> {
		const keys = await this.redis.keys("config:*");
		const result: Record<string, ProviderConfig> = {};

		for (const key of keys) {
			const provider = key.replace("config:", "");
			const config = await this.getProviderConfig(provider);
			if (config) {
				result[provider] = config;
			}
		}

		return result;
	}
}
