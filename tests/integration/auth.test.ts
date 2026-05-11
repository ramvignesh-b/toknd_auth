// @ts-nocheck
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { redis } from "../../src/core/RedisClient";
import { app } from "../../src/index";

describe("Auth Integration", () => {
	afterEach(() => {
		mock.restore();
		redis.get.mockImplementation(() => Promise.resolve(null));
	});

	const mockProviderConfig = JSON.stringify({
		clientId: "trakt-client-id",
		clientSecret: "trakt-client-secret",
		authUrl: "https://trakt.tv/oauth/authorize",
		tokenUrl: "https://api.trakt.tv/oauth/token",
		scope: "public",
	});

	it("should redirect to provider login", async () => {
		redis.get.mockImplementation((key) => {
			if (key.includes("config:trakt")) return Promise.resolve(mockProviderConfig);
			return Promise.resolve(null);
		});

		const res = await app.request("/auth/trakt/login");

		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toContain("trakt.tv/oauth/authorize");
		expect(res.headers.get("Location")).toContain("client_id=trakt-client-id");
	});

	it("should handle callback and exchange code", async () => {
		redis.get.mockImplementation((key) => {
			if (key.includes("config:trakt")) return Promise.resolve(mockProviderConfig);
			return Promise.resolve(null);
		});

		const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						access_token: "exchange-access-token",
						refresh_token: "exchange-refresh-token",
						expires_in: 3600,
					}),
			}),
		);

		const res = await app.request("/auth/callback?state=trakt&code=temporary-auth-code");

		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe("/app/success?provider=trakt");
		expect(redis.set).toHaveBeenCalled();
		expect(fetchSpy).toHaveBeenCalled();
	});

	it("should return 404 if provider not configured during login", async () => {
		const res = await app.request("/auth/unknown-provider/login");

		expect(res.status).toBe(404);
	});

	it("should return 400 if callback is missing state or code", async () => {
		const res = await app.request("/auth/callback?code=some-code");

		expect(res.status).toBe(400);
	});
});
