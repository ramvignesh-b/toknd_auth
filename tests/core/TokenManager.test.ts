import { describe, expect, it, mock } from "bun:test";
import { TokenManager } from "../../src/core/TokenManager";

describe("TokenManager", () => {
	it("should return token from redis if available", async () => {
		const redisMock = { get: mock(() => Promise.resolve("valid_token")) };
		const manager = new TokenManager(redisMock as any, {} as any);
		const token = await manager.getAccessToken("trakt");
		expect(token).toBe("valid_token");
	});

	it("should refresh token if access token is missing but refresh token exists", async () => {
		const redisMock = {
			get: mock((key: string) => Promise.resolve(key.includes("refresh") ? "refresh_token" : null)),
			set: mock(() => Promise.resolve()),
		};
		const providerMock = {
			refreshToken: mock(() =>
				Promise.resolve({
					accessToken: "new_token",
					refreshToken: "new_refresh",
					expiresIn: 3600,
				}),
			),
		};
		const manager = new TokenManager(redisMock as any, providerMock as any);
		const token = await manager.getAccessToken("trakt");
		expect(token).toBe("new_token");
		expect(redisMock.set).toHaveBeenCalled();
	});

	it("should return null if no tokens are found", async () => {
		const redisMock = { get: mock(() => Promise.resolve(null)) };
		const manager = new TokenManager(redisMock as any, {} as any);
		const token = await manager.getAccessToken("trakt");
		expect(token).toBeNull();
	});

	it("should refresh token via forceRefresh", async () => {
		const redisMock = {
			get: mock(() => Promise.resolve("refresh_token")),
			set: mock(() => Promise.resolve()),
		};
		const providerMock = {
			refreshToken: mock(() =>
				Promise.resolve({
					accessToken: "forced_token",
					refreshToken: "new_refresh",
					expiresIn: 3600,
				}),
			),
		};
		const manager = new TokenManager(redisMock as any, providerMock as any);
		const token = await manager.forceRefresh("trakt");
		expect(token).toBe("forced_token");
		expect(providerMock.refreshToken).toHaveBeenCalledWith("refresh_token");
	});

	it("should return null in forceRefresh if no refresh token is found", async () => {
		const redisMock = { get: mock(() => Promise.resolve(null)) };
		const manager = new TokenManager(redisMock as any, {} as any);
		const token = await manager.forceRefresh("trakt");
		expect(token).toBeNull();
	});
});
