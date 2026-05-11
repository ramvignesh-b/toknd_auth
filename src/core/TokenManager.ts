import type { Redis } from "ioredis";
import type { OAuthProvider, TokenResponse } from "../providers/interface";

export class TokenManager {
	constructor(
		private redis: Redis,
		private provider: OAuthProvider,
	) {}

	async getAccessToken(providerName: string): Promise<string | null> {
		const accessKey = `provider:${providerName}:access_token`;
		const cached = await this.redis.get(accessKey);
		if (cached) return cached;

		const refreshKey = `provider:${providerName}:refresh_token`;
		const refreshToken = await this.redis.get(refreshKey);
		if (!refreshToken) return null;

		const tokens = await this.provider.refreshToken(refreshToken);
		await this.saveTokens(providerName, tokens);
		return tokens.accessToken;
	}

	async refreshAccessToken(providerName: string): Promise<string | null> {
		const refreshKey = `provider:${providerName}:refresh_token`;
		const refreshToken = await this.redis.get(refreshKey);
		if (!refreshToken) return null;

		const tokens = await this.provider.refreshToken(refreshToken);
		await this.saveTokens(providerName, tokens);
		return tokens.accessToken;
	}

	async saveTokens(providerName: string, tokens: TokenResponse) {
		await this.redis.set(
			`provider:${providerName}:access_token`,
			tokens.accessToken,
			"EX",
			tokens.expiresIn,
		);
		await this.redis.set(`provider:${providerName}:refresh_token`, tokens.refreshToken);
		await this.redis.set(`provider:${providerName}:last_updated`, new Date().toISOString());
	}
}
