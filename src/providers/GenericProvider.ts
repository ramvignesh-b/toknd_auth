import { z } from "zod";
import type { ProviderConfig } from "../core/ConfigManager";
import type { OAuthProvider, TokenResponse } from "./interface";

const TokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	expires_in: z.number(),
});

export class GenericProvider implements OAuthProvider {
	constructor(
		public name: string,
		private config: ProviderConfig,
	) {}

	getAuthUrl(): string {
		const params = new URLSearchParams({
			response_type: "code",
			client_id: this.config.clientId,
			redirect_uri: this.config.redirectUri,
			scope: this.config.scope,
		});
		return `${this.config.authUrl}?${params.toString()}`;
	}

	async exchangeCode(code: string): Promise<TokenResponse> {
		const response = await fetch(this.config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				code,
				client_id: this.config.clientId,
				client_secret: this.config.clientSecret,
				redirect_uri: this.config.redirectUri,
				grant_type: "authorization_code",
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to exchange code: ${response.status} ${error}`);
		}

		const rawData = await response.json();
		const data = TokenResponseSchema.parse(rawData);

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresIn: data.expires_in,
		};
	}

	async refreshToken(refreshToken: string): Promise<TokenResponse> {
		const response = await fetch(this.config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				refresh_token: refreshToken,
				client_id: this.config.clientId,
				client_secret: this.config.clientSecret,
				grant_type: "refresh_token",
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to refresh token: ${response.status} ${error}`);
		}

		const rawData = await response.json();
		const data = TokenResponseSchema.parse(rawData);

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresIn: data.expires_in,
		};
	}
}
