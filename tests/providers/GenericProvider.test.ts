// @ts-nocheck
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { GenericProvider } from "../../src/providers/GenericProvider";

describe("GenericProvider", () => {
	const traktConfig = {
		clientId: "trakt-client-id",
		clientSecret: "trakt-client-secret",
		authUrl: "https://trakt.tv/oauth/authorize",
		tokenUrl: "https://api.trakt.tv/oauth/token",
		scope: "public",
	};

	afterEach(() => {
		mock.restore();
	});

	it("should generate correct auth URL", () => {
		const provider = new GenericProvider("trakt", traktConfig);

		const url = provider.getAuthUrl("random-state-123", "https://callback.com");

		expect(url).toContain("client_id=trakt-client-id");
		expect(url).toContain("redirect_uri=https%3A%2F%2Fcallback.com");
		expect(url).toContain("state=random-state-123");
	});

	it("should handle token response with string expiry", async () => {
		const provider = new GenericProvider("trakt", traktConfig);
		const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						access_token: "new-access-token",
						refresh_token: "new-refresh-token",
						expires_in: "7200",
					}),
				text: () => Promise.resolve(""),
			}),
		);

		const tokens = await provider.refreshToken("old-refresh-token");

		expect(tokens.accessToken).toBe("new-access-token");
		expect(tokens.expiresIn).toBe(7200);
		expect(fetchSpy).toHaveBeenCalled();
	});

	it("should handle token response without new refresh token", async () => {
		const provider = new GenericProvider("trakt", traktConfig);
		spyOn(globalThis, "fetch").mockImplementation(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						access_token: "new-access-token-only",
						expires_in: 3600,
					}),
				text: () => Promise.resolve(""),
			}),
		);

		const tokens = await provider.refreshToken("existing-refresh-token");

		expect(tokens.accessToken).toBe("new-access-token-only");
		expect(tokens.refreshToken).toBe("existing-refresh-token");
	});
});
