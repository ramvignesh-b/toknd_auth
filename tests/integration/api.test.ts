// @ts-nocheck
import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("../../src/core/RedisClient", () => ({
	redis: {
		get: mock(() => Promise.resolve(null)),
		set: mock(() => Promise.resolve()),
		keys: mock(() => Promise.resolve([])),
	},
}));

import { redis } from "../../src/core/RedisClient";
import { app } from "../../src/index";

describe("API Integration", () => {
	afterEach(() => {
		redis.get.mockImplementation(() => Promise.resolve(null));
		redis.set.mockImplementation(() => Promise.resolve());
		redis.keys.mockImplementation(() => Promise.resolve([]));
	});

	it("should return 401 if API Key is missing", async () => {
		const res = await app.request("/api/status");

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: "Missing or invalid authorization header" });
	});

	it("should return 200 for health check (no auth needed)", async () => {
		const res = await app.request("/health");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe("ok");
	});

	it("should return 200 for status with valid API Key", async () => {
		redis.keys.mockReturnValue(Promise.resolve(["config:trakt"]));
		redis.get.mockImplementation((key) => {
			if (key.includes("config"))
				return Promise.resolve(
					JSON.stringify({
						clientId: "id",
						clientSecret: "s",
						authUrl: "https://a.com",
						tokenUrl: "https://t.com",
						scope: "x",
					}),
				);
			return Promise.resolve("mock_value");
		});

		const res = await app.request("/api/status", {
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.trakt).toBeDefined();
		expect(body.trakt.accessToken).toBe("mock_value");
	});

	it("should return 404 for unknown provider token", async () => {
		const res = await app.request("/api/token/unknown", {
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(404);
	});
});
