import { describe, expect, it, mock } from "bun:test";
import { TokenManager } from "../../src/core/TokenManager";

describe("TokenManager", () => {
	const tenantId = "test-tenant";

	it("should return token from redis if available", async () => {
		const redis = { get: mock(() => Promise.resolve("active-access-token")) };
		const manager = new TokenManager(redis as any, {} as any);

		const token = await manager.getAccessToken(tenantId, "trakt");

		expect(token).toBe("active-access-token");
		expect(redis.get).toHaveBeenCalledWith(`tenant:${tenantId}:provider:trakt:access_token`);
	});

	it("should refresh token if access token is missing but refresh token exists", async () => {
		const redis = {
			get: mock((key) => Promise.resolve(key.includes("refresh") ? "valid-refresh-token" : null)),
			set: mock(() => Promise.resolve()),
		};
		const provider = {
			refreshToken: mock(() =>
				Promise.resolve({
					accessToken: "newly-refreshed-access-token",
					refreshToken: "newly-refreshed-refresh-token",
					expiresIn: 3600,
				}),
			),
		};
		const manager = new TokenManager(redis as any, provider as any);

		const token = await manager.getAccessToken(tenantId, "trakt");

		expect(token).toBe("newly-refreshed-access-token");
		expect(redis.get).toHaveBeenCalledWith(`tenant:${tenantId}:provider:trakt:access_token`);
		expect(redis.get).toHaveBeenCalledWith(`tenant:${tenantId}:provider:trakt:refresh_token`);
		expect(redis.set).toHaveBeenCalledWith(
			`tenant:${tenantId}:provider:trakt:access_token`,
			"newly-refreshed-access-token",
			"EX",
			3600,
		);
	});

	it("should return null if no tokens are found", async () => {
		const redis = { get: mock(() => Promise.resolve(null)) };
		const manager = new TokenManager(redis as any, {} as any);

		const token = await manager.getAccessToken(tenantId, "trakt");

		expect(token).toBeNull();
	});

	it("should refresh token via refreshAccessToken", async () => {
		const redis = {
			get: mock(() => Promise.resolve("existing-refresh-token")),
			set: mock(() => Promise.resolve()),
		};
		const provider = {
			refreshToken: mock(() =>
				Promise.resolve({
					accessToken: "manually-refreshed-access-token",
					refreshToken: "manually-refreshed-refresh-token",
					expiresIn: 3600,
				}),
			),
		};
		const manager = new TokenManager(redis as any, provider as any);

		const token = await manager.refreshAccessToken(tenantId, "trakt");

		expect(token).toBe("manually-refreshed-access-token");
		expect(redis.get).toHaveBeenCalledWith(`tenant:${tenantId}:provider:trakt:refresh_token`);
		expect(provider.refreshToken).toHaveBeenCalledWith("existing-refresh-token");
		expect(redis.set).toHaveBeenCalledWith(
			`tenant:${tenantId}:provider:trakt:access_token`,
			"manually-refreshed-access-token",
			"EX",
			3600,
		);
	});

	it("should return null in refreshAccessToken if no refresh token is found", async () => {
		const redis = { get: mock(() => Promise.resolve(null)) };
		const manager = new TokenManager(redis as any, {} as any);

		const token = await manager.refreshAccessToken(tenantId, "trakt");

		expect(token).toBeNull();
	});
});
