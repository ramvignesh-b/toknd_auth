import { describe, expect, it, spyOn } from "bun:test";
import { API_PREFIX } from "../../src/constants";
import { redis } from "../../src/core/RedisClient";
import { app } from "../../src/index";

describe("API Integration", () => {
	const mockTraktConfig = JSON.stringify({
		clientId: "trakt-client-id",
		clientSecret: "trakt-client-secret",
		authUrl: "https://trakt.tv/oauth/authorize",
		tokenUrl: "https://api.trakt.tv/oauth/token",
		scope: "public",
	});

	const tenantId = "test-tenant";

	it("should return 401 if API Key is missing", async () => {
		const res = await app.request(`${API_PREFIX}/status`);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: "Missing or invalid authorization" });
	});

	it("should return 200 for health check (no auth needed)", async () => {
		const res = await app.request("/health");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe("ok");
	});

	it("should return 503 for health check if redis is down", async () => {
		(redis as any).status = "connecting";

		const res = await app.request("/health");
		const body = await res.json();

		expect(res.status).toBe(503);
		expect(body.status).toBe("error");
		expect(body.redis).toBe("connecting");
	});

	it("should return 400 if X-Tenant-ID is missing", async () => {
		const res = await app.request(`${API_PREFIX}/status`, {
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(400);
	});

	it("should return 200 for status with valid API Key and X-Tenant-ID", async () => {
		(redis.keys as any).mockReturnValue(Promise.resolve(["config:trakt"]));
		(redis.get as any).mockImplementation((key) => {
			if (key.includes("config")) return Promise.resolve(mockTraktConfig);
			if (key.includes(`tenant:${tenantId}:provider:trakt:access_token`))
				return Promise.resolve("current-access-token");
			if (key.includes(`tenant:${tenantId}:provider:trakt:refresh_token`))
				return Promise.resolve("current-refresh-token");
			return Promise.resolve(null);
		});

		const res = await app.request(`${API_PREFIX}/status`, {
			headers: {
				Authorization: "Bearer test-api-key",
				"X-Tenant-ID": tenantId,
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.trakt).toBeDefined();
		expect(body.trakt.accessToken).toBe("current-access-token");
		expect(redis.get).toHaveBeenCalledWith(`tenant:${tenantId}:provider:trakt:access_token`);
	});

	it("should return token for a configured provider with X-Tenant-ID", async () => {
		(redis.get as any).mockImplementation((key) => {
			if (key.includes("config:trakt")) return Promise.resolve(mockTraktConfig);
			if (key.includes(`tenant:${tenantId}:provider:trakt:access_token`))
				return Promise.resolve("trakt-active-token");
			return Promise.resolve(null);
		});

		const res = await app.request(`${API_PREFIX}/token/trakt`, {
			headers: {
				Authorization: "Bearer test-api-key",
				"X-Tenant-ID": tenantId,
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.access_token).toBe("trakt-active-token");
		expect(redis.get).toHaveBeenCalledWith(`tenant:${tenantId}:provider:trakt:access_token`);
	});

	it("should successfully refresh a token with X-Tenant-ID", async () => {
		(redis.get as any).mockImplementation((key) => {
			if (key.includes("config:trakt")) return Promise.resolve(mockTraktConfig);
			if (key.includes(`tenant:${tenantId}:provider:trakt:refresh_token`))
				return Promise.resolve("old-refresh-token");
			return Promise.resolve("new-access-token-from-refresh");
		});

		spyOn(globalThis, "fetch").mockImplementation(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						access_token: "new-access-token-from-fetch",
						refresh_token: "new-refresh-token-from-fetch",
						expires_in: 3600,
					}),
			} as any),
		);

		const res = await app.request(`${API_PREFIX}/refresh/trakt`, {
			method: "POST",
			headers: {
				Authorization: "Bearer test-api-key",
				"X-Tenant-ID": tenantId,
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.status.accessToken).toBe("new-access-token-from-refresh");
		expect(redis.get).toHaveBeenCalledWith(`tenant:${tenantId}:provider:trakt:refresh_token`);
	});
});
