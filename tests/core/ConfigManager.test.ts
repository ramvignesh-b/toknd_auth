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
		const config = {
			clientId: "id",
			clientSecret: "secret",
			authUrl: "https://auth.com",
			tokenUrl: "https://token.com",
			scope: "all",
		};

		await manager.setProviderConfig("test", config);
		const retrieved = await manager.getProviderConfig("test");

		expect(retrieved).toEqual(config);
		expect(redis.set).toHaveBeenCalled();
	});

	it("should return all providers", async () => {
		const redis = {
			keys: mock(() => Promise.resolve(["config:p1", "config:p2"])),
			get: mock((key) =>
				Promise.resolve(
					JSON.stringify({
						clientId: key,
						clientSecret: "s",
						authUrl: "https://a.com",
						tokenUrl: "https://t.com",
						scope: "x",
					}),
				),
			),
		};
		const manager = new ConfigManager(redis);

		const providers = await manager.getAllProviders();

		expect(Object.keys(providers)).toHaveLength(2);
		expect(providers.p1.clientId).toBe("config:p1");
	});

	it("should return null for non-existent provider", async () => {
		const redis = { get: mock(() => Promise.resolve(null)) };
		const manager = new ConfigManager(redis);

		const config = await manager.getProviderConfig("missing");

		expect(config).toBeNull();
	});
});
