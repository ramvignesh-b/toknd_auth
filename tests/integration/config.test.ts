import { describe, expect, it } from "bun:test";
import { API_PREFIX } from "../../src/constants";
import { redis } from "../../src/core/RedisClient";
import { app } from "../../src/index";

describe("Config Integration", () => {
	it("should list all configured providers", async () => {
		(redis.keys as any).mockReturnValue(Promise.resolve(["config:trakt"]));
		(redis.get as any).mockImplementation(() =>
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

		const res = await app.request(`${API_PREFIX}/config`, {
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

		const res = await app.request(`${API_PREFIX}/config/github`, {
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

		const res = await app.request(`${API_PREFIX}/config/invalid`, {
			method: "POST",
			headers: {
				Authorization: "Bearer test-api-key",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(invalidConfig),
		});

		expect(res.status).toBe(400);
	});

	it("should delete a provider configuration and clean up all tenant tokens", async () => {
		(redis.keys as any).mockReturnValue(Promise.resolve(["tenant:1:provider:trakt:token"]));
		const res = await app.request(`${API_PREFIX}/config/trakt`, {
			method: "DELETE",
			headers: {
				Authorization: "Bearer test-api-key",
			},
		});

		expect(res.status).toBe(200);
		expect(redis.del).toHaveBeenCalledWith("config:trakt");
		expect(redis.keys).toHaveBeenCalledWith("tenant:*:provider:trakt:*");
		expect(redis.del).toHaveBeenCalledWith("tenant:1:provider:trakt:token");
	});
});
