import type { Redis } from "ioredis";
import { z } from "zod";

export const ProviderConfigSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
	redirectUri: z.url().optional(),
	authUrl: z.url(),
	tokenUrl: z.url(),
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

	async deleteProviderConfig(provider: string): Promise<void> {
		await this.redis.del(`config:${provider}`);
		// Also clean up tokens
		const tokenKeys = await this.redis.keys(`provider:${provider}:*`);
		if (tokenKeys.length > 0) {
			await this.redis.del(...tokenKeys);
		}
	}
}
