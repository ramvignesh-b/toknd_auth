// @ts-nocheck
import { afterEach, describe, expect, it, mock } from "bun:test";
import { redis } from "../../src/core/RedisClient";
import { app } from "../../src/index";

describe("Config Integration", () => {
	afterEach(() => {
		mock.restore();
		redis.get.mockImplementation(() => Promise.resolve(null));
		redis.set.mockImplementation(() => Promise.resolve());
		redis.keys.mockImplementation(() => Promise.resolve([]));
	});

	it("should list all configured providers", async () => {
		redis.keys.mockReturnValue(Promise.resolve(["config:trakt"]));
		redis.get.mockImplementation(() =>
			Promise.resolve(
				JSON.stringify({
					clientId: "trakt-client-id",
					clientSecret: "trakt-client-secret",
					authUrl: "https://trakt.tv/oauth/authorize",
					tokenUrl: "https://api.trakt.tv/oauth/token",
					scope: "public",
				}),
			),
		);

		const res = await app.request("/api/config", {
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.trakt).toBeDefined();
		expect(body.trakt.clientId).toBe("trakt-client-id");
	});

	it("should set a new provider config", async () => {
		const newProviderConfig = {
			clientId: "github-client-id",
			clientSecret: "github-client-secret",
			authUrl: "https://github.com/login/oauth/authorize",
			tokenUrl: "https://github.com/login/oauth/access_token",
			scope: "user:email",
		};

		const res = await app.request("/api/config/github", {
			method: "POST",
			headers: {
				Authorization: "Bearer test-api-key",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(newProviderConfig),
		});

		expect(res.status).toBe(200);
		expect(redis.set).toHaveBeenCalledWith(
			"config:github",
			expect.stringContaining("github-client-id"),
		);
	});

	it("should return 400 for invalid config body", async () => {
		const invalidConfig = {
			clientId: "missing-other-required-fields",
		};

		const res = await app.request("/api/config/invalid", {
			method: "POST",
			headers: {
				Authorization: "Bearer test-api-key",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(invalidConfig),
		});

		expect(res.status).toBe(400);
	});
});
