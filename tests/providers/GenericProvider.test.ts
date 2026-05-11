// @ts-nocheck
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { GenericProvider } from "../../src/providers/GenericProvider";

describe("GenericProvider", () => {
	const config = {
		clientId: "id",
		clientSecret: "secret",
		authUrl: "https://auth.com",
		tokenUrl: "https://token.com",
		scope: "all",
	};

	afterEach(() => {
		mock.restore();
	});

	it("should generate correct auth URL", () => {
		const provider = new GenericProvider("test", config);

		const url = provider.getAuthUrl("test", "http://cb.com");

		expect(url).toContain("client_id=id");
		expect(url).toContain("redirect_uri=http%3A%2F%2Fcb.com");
		expect(url).toContain("state=test");
	});

	it("should handle token response with string expiry", async () => {
		const provider = new GenericProvider("test", config);
		const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						access_token: "at",
						refresh_token: "rt",
						expires_in: "3600",
					}),
				text: () => Promise.resolve(""),
			}),
		);

		const tokens = await provider.refreshToken("old_rt");

		expect(tokens.accessToken).toBe("at");
		expect(tokens.expiresIn).toBe(3600);
		expect(fetchSpy).toHaveBeenCalled();
	});

	it("should handle token response without new refresh token", async () => {
		const provider = new GenericProvider("test", config);
		spyOn(globalThis, "fetch").mockImplementation(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						access_token: "at",
						expires_in: 3600,
					}),
				text: () => Promise.resolve(""),
			}),
		);

		const tokens = await provider.refreshToken("old_rt");

		expect(tokens.accessToken).toBe("at");
		expect(tokens.refreshToken).toBe("old_rt");
	});
});
