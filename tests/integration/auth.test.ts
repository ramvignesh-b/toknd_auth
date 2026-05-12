import { describe, expect, it, spyOn } from "bun:test";
import { AUTH_PREFIX } from "../../src/constants";
import { redis } from "../../src/core/RedisClient";
import { app } from "../../src/index";

describe("Auth Integration", () => {
	const mockProviderConfig = JSON.stringify({
		clientId: "trakt-client-id",
		clientSecret: "trakt-client-secret",
		authUrl: "https://trakt.tv/oauth/authorize",
		tokenUrl: "https://api.trakt.tv/oauth/token",
		scope: "public",
	});

	const tenantId = "test-tenant";

	it("should redirect to provider login with tenantId in state", async () => {
		(redis.get as any).mockImplementation((key: string) => {
			if (key.includes("config:trakt")) return Promise.resolve(mockProviderConfig);
			return Promise.resolve(null);
		});

		const res = await app.request(`${AUTH_PREFIX}/trakt/login?tenantId=${tenantId}`);

		expect(res.status).toBe(302);
		const location = res.headers.get("Location") || "";
		expect(location).toContain("trakt.tv/oauth/authorize");
		expect(location).toContain("client_id=trakt-client-id");
		expect(location).toContain(`state=${tenantId}:trakt`);
	});

	it("should handle callback and exchange code using tenantId from state", async () => {
		(redis.get as any).mockImplementation((key: string) => {
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
			} as any),
		);

		const res = await app.request(
			`${AUTH_PREFIX}/callback?state=${tenantId}:trakt&code=temporary-auth-code`,
		);

		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe(`/app/success?provider=trakt&tenantId=${tenantId}`);
		expect(redis.set).toHaveBeenCalledWith(
			`tenant:${tenantId}:provider:trakt:access_token`,
			"exchange-access-token",
			"EX",
			3600,
		);
		expect(fetchSpy).toHaveBeenCalled();
	});

	it("should return 404 if provider not configured during login", async () => {
		const res = await app.request(`${AUTH_PREFIX}/unknown-provider/login?tenantId=${tenantId}`);

		expect(res.status).toBe(404);
	});

	it("should return 400 if callback is missing state or code", async () => {
		const res = await app.request(`${AUTH_PREFIX}/callback?code=some-code`);

		expect(res.status).toBe(400);
	});
});
