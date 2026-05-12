import type { Redis } from "ioredis";
import type { OAuthProvider, TokenResponse } from "../providers/interface";

export class TokenManager {
	constructor(
		private redis: Redis,
		private provider: OAuthProvider,
	) {}

	async getAccessToken(tenantId: string, providerName: string): Promise<string | null> {
		const accessKey = `tenant:${tenantId}:provider:${providerName}:access_token`;
		const cached = await this.redis.get(accessKey);
		if (cached) return cached;

		const refreshKey = `tenant:${tenantId}:provider:${providerName}:refresh_token`;
		const refreshToken = await this.redis.get(refreshKey);
		if (!refreshToken) return null;

		const tokens = await this.provider.refreshToken(refreshToken);
		await this.saveTokens(tenantId, providerName, tokens);
		return tokens.accessToken;
	}

	async refreshAccessToken(tenantId: string, providerName: string): Promise<string | null> {
		const refreshKey = `tenant:${tenantId}:provider:${providerName}:refresh_token`;
		const refreshToken = await this.redis.get(refreshKey);
		if (!refreshToken) return null;

		const tokens = await this.provider.refreshToken(refreshToken);
		await this.saveTokens(tenantId, providerName, tokens);
		return tokens.accessToken;
	}

	async saveTokens(tenantId: string, providerName: string, tokens: TokenResponse) {
		const baseKey = `tenant:${tenantId}:provider:${providerName}`;
		await this.redis.set(`${baseKey}:access_token`, tokens.accessToken, "EX", tokens.expiresIn);
		await this.redis.set(`${baseKey}:refresh_token`, tokens.refreshToken);
		await this.redis.set(`${baseKey}:last_updated`, new Date().toISOString());
		await this.redis.set(
			`${baseKey}:expires_at`,
			new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
		);
	}
}
