// @ts-nocheck
import { describe, expect, it, mock } from "bun:test";
import { ConfigManager } from "../../src/core/ConfigManager";

describe("ConfigManager", () => {
	it("should save and retrieve provider configuration", async () => {
		const storage = {};
		const redis = {
			set: mock((key, val) => {
				storage[key] = val;
				return Promise.resolve();
			}),
			get: mock((key) => Promise.resolve(storage[key] || null)),
		};
		const manager = new ConfigManager(redis);
		const traktConfig = {
			clientId: "trakt-client-id",
			clientSecret: "trakt-client-secret",
			authUrl: "https://trakt.tv/oauth/authorize",
			tokenUrl: "https://api.trakt.tv/oauth/token",
			scope: "public",
		};

		await manager.setProviderConfig("trakt", traktConfig);
		const retrieved = await manager.getProviderConfig("trakt");

		expect(retrieved).toEqual(traktConfig);
		expect(redis.set).toHaveBeenCalled();
	});

	it("should return all providers", async () => {
		const redis = {
			keys: mock(() => Promise.resolve(["config:trakt", "config:github"])),
			get: mock((key) =>
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
		const manager = new ConfigManager(redis);

		const providers = await manager.getAllProviders();

		expect(Object.keys(providers)).toHaveLength(2);
		expect(providers.trakt.clientId).toBe("config:trakt-id");
	});

	it("should return null for non-existent provider", async () => {
		const redis = { get: mock(() => Promise.resolve(null)) };
		const manager = new ConfigManager(redis);

		const config = await manager.getProviderConfig("missing-provider");

		expect(config).toBeNull();
	});
});
