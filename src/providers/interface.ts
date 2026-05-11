export interface TokenResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

export interface OAuthProvider {
	name: string;
	getAuthUrl(): string;
	exchangeCode(code: string): Promise<TokenResponse>;
	refreshToken(refreshToken: string): Promise<TokenResponse>;
}
