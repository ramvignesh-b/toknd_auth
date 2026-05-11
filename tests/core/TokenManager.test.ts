// @ts-nocheck
import { describe, expect, it, mock } from "bun:test";
import { TokenManager } from "../../src/core/TokenManager";

describe("TokenManager", () => {
	it("should return token from redis if available", async () => {
		const redis = { get: mock(() => Promise.resolve("valid_token")) };
		const manager = new TokenManager(redis, {});

		const token = await manager.getAccessToken("trakt");

		expect(token).toBe("valid_token");
	});

	it("should refresh token if access token is missing but refresh token exists", async () => {
		const redis = {
			get: mock((key) => Promise.resolve(key.includes("refresh") ? "refresh_token" : null)),
			set: mock(() => Promise.resolve()),
		};
		const provider = {
			refreshToken: mock(() =>
				Promise.resolve({
					accessToken: "new_token",
					refreshToken: "new_refresh",
					expiresIn: 3600,
				}),
			),
		};
		const manager = new TokenManager(redis, provider);

		const token = await manager.getAccessToken("trakt");

		expect(token).toBe("new_token");
		expect(redis.set).toHaveBeenCalled();
	});

	it("should return null if no tokens are found", async () => {
		const redis = { get: mock(() => Promise.resolve(null)) };
		const manager = new TokenManager(redis, {});

		const token = await manager.getAccessToken("trakt");

		expect(token).toBeNull();
	});

	it("should refresh token via refreshAccessToken", async () => {
		const redis = {
			get: mock(() => Promise.resolve("refresh_token")),
			set: mock(() => Promise.resolve()),
		};
		const provider = {
			refreshToken: mock(() =>
				Promise.resolve({
					accessToken: "forced_token",
					refreshToken: "new_refresh",
					expiresIn: 3600,
				}),
			),
		};
		const manager = new TokenManager(redis, provider);

		const token = await manager.refreshAccessToken("trakt");

		expect(token).toBe("forced_token");
		expect(provider.refreshToken).toHaveBeenCalledWith("refresh_token");
	});

	it("should return null in refreshAccessToken if no refresh token is found", async () => {
		const redis = { get: mock(() => Promise.resolve(null)) };
		const manager = new TokenManager(redis, {});

		const token = await manager.refreshAccessToken("trakt");

		expect(token).toBeNull();
	});
});
