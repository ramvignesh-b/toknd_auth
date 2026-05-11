// @ts-nocheck
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { redis } from "../../src/core/RedisClient";
import { app } from "../../src/index";

describe("API Integration", () => {
	afterEach(() => {
		mock.restore();
		redis.get.mockImplementation(() => Promise.resolve(null));
		redis.set.mockImplementation(() => Promise.resolve());
		redis.keys.mockImplementation(() => Promise.resolve([]));
	});

	const mockTraktConfig = JSON.stringify({
		clientId: "trakt-client-id",
		clientSecret: "trakt-client-secret",
		authUrl: "https://trakt.tv/oauth/authorize",
		tokenUrl: "https://api.trakt.tv/oauth/token",
		scope: "public",
	});

	it("should return 401 if API Key is missing", async () => {
		const res = await app.request("/api/status");

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
		redis.status = "connecting";

		const res = await app.request("/health");
		const body = await res.json();

		expect(res.status).toBe(503);
		expect(body.status).toBe("error");
		expect(body.redis).toBe("connecting");
	});

	it("should return 200 for status with valid API Key", async () => {
		redis.keys.mockReturnValue(Promise.resolve(["config:trakt"]));
		redis.get.mockImplementation((key) => {
			if (key.includes("config")) return Promise.resolve(mockTraktConfig);
			if (key.includes("access_token")) return Promise.resolve("current-access-token");
			if (key.includes("refresh_token")) return Promise.resolve("current-refresh-token");
			return Promise.resolve(null);
		});

		const res = await app.request("/api/status", {
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.trakt).toBeDefined();
		expect(body.trakt.accessToken).toBe("current-access-token");
	});

	it("should return 200 for status with valid Cookie", async () => {
		redis.keys.mockReturnValue(Promise.resolve(["config:trakt"]));
		redis.get.mockImplementation((key) => {
			if (key.includes("config")) return Promise.resolve(mockTraktConfig);
			if (key.includes("access_token")) return Promise.resolve("current-access-token");
			return Promise.resolve(null);
		});

		const res = await app.request("/api/status", {
			headers: {
				Cookie: "toknd_api_key=test-api-key",
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.trakt).toBeDefined();
	});

	it("should return 404 for unknown provider token", async () => {
		const res = await app.request("/api/token/unconfigured-provider", {
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(404);
	});

	it("should return token for a configured provider", async () => {
		redis.get.mockImplementation((key) => {
			if (key.includes("config:trakt")) return Promise.resolve(mockTraktConfig);
			if (key.includes("access_token")) return Promise.resolve("trakt-active-token");
			return Promise.resolve(null);
		});

		const res = await app.request("/api/token/trakt", {
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.access_token).toBe("trakt-active-token");
	});

	it("should return 404 if no access token is in redis for a valid provider", async () => {
		redis.get.mockImplementation((key) => {
			if (key.includes("config:trakt")) return Promise.resolve(mockTraktConfig);
			return Promise.resolve(null);
		});

		const res = await app.request("/api/token/trakt", {
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toContain("No tokens found");
	});

	it("should successfully refresh a token", async () => {
		redis.get.mockImplementation((key) => {
			if (key.includes("config:trakt")) return Promise.resolve(mockTraktConfig);
			if (key.includes("refresh_token")) return Promise.resolve("old-refresh-token");
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
			}),
		);

		const res = await app.request("/api/refresh/trakt", {
			method: "POST",
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.status.accessToken).toBe("new-access-token-from-refresh");
	});
});
