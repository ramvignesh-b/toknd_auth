import { describe, expect, it, mock } from "bun:test";
import { ConfigManager } from "../../src/core/ConfigManager";

describe("ConfigManager", () => {
	it("should save and retrieve provider configuration", async () => {
		const storage: Record<string, string> = {};
		const redis = {
			set: mock((key: string, val: string) => {
				storage[key] = val;
				return Promise.resolve();
			}),
			get: mock((key: string) => Promise.resolve(storage[key] || null)),
		};
		const manager = new ConfigManager(redis as any);
		const traktConfig = {
			clientId: "trakt-client-id",
			clientSecret: "trakt-client-secret",
			authUrl: "https://trakt.tv/oauth/authorize",
			tokenUrl: "https://api.trakt.tv/oauth/token",
			scope: "public",
		};

		await manager.setProviderConfig("trakt", traktConfig);
		const retrieved = await manager.getProviderConfig("trakt");

		expect(retrieved).toEqual(traktConfig as any);
		expect(redis.set).toHaveBeenCalled();
	});

	it("should return all providers", async () => {
		const redis = {
			keys: mock(() => Promise.resolve(["config:trakt", "config:github"])),
			get: mock((key: string) =>
				Promise.resolve(
					JSON.stringify({
						clientId: `${key}-id`,
						clientSecret: "secret",
						authUrl: "https://auth.com",
						tokenUrl: "https://token.com",
						scope: "all",
					}),
				),
			),
		};
		const manager = new ConfigManager(redis as any);

		const providers = await manager.getAllProviders();

		expect(Object.keys(providers)).toHaveLength(2);
		expect(providers.trakt.clientId).toBe("config:trakt-id");
	});

	it("should return null for non-existent provider", async () => {
		const redis = { get: mock(() => Promise.resolve(null)) };
		const manager = new ConfigManager(redis as any);

		const config = await manager.getProviderConfig("missing-provider");

		expect(config).toBeNull();
	});

	it("should delete provider configuration and all tenant tokens", async () => {
		const redis = {
			del: mock(() => Promise.resolve()),
			keys: mock(() =>
				Promise.resolve([
					"tenant:1:provider:trakt:access_token",
					"tenant:2:provider:trakt:access_token",
				]),
			),
		};
		const manager = new ConfigManager(redis as any);

		await manager.deleteProviderConfig("trakt");

		expect(redis.del).toHaveBeenCalledWith("config:trakt");
		expect(redis.keys).toHaveBeenCalledWith("tenant:*:provider:trakt:*");
		expect(redis.del).toHaveBeenCalledWith(
			"tenant:1:provider:trakt:access_token",
			"tenant:2:provider:trakt:access_token",
		);
	});
});
