export interface TokenResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

export interface OAuthProvider {
	name: string;
	getAuthUrl(state: string, redirectUri: string): string;
	exchangeCode(code: string, redirectUri: string): Promise<TokenResponse>;
	refreshToken(refreshToken: string): Promise<TokenResponse>;
}
