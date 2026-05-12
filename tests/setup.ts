// @ts-nocheck
process.env.API_KEY = "test-api-key";
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";
process.env.APP_PORT = "3000";

import { afterEach, mock } from "bun:test";

// Global config mock
mock.module("../src/config", () => ({
	config: {
		API_KEY: "test-api-key",
		REDIS_HOST: "localhost",
		REDIS_PORT: 6379,
		APP_PORT: "3000",
	},
}));

// Global Redis mock
mock.module("../src/core/RedisClient", () => ({
	redis: {
		status: "ready",
		get: mock(() => Promise.resolve(null)),
		set: mock(() => Promise.resolve()),
		del: mock(() => Promise.resolve(1)),
		keys: mock(() => Promise.resolve([])),
		on: mock(() => {}),
	},
}));

afterEach(async () => {
	const { redis } = await import("../src/core/RedisClient");
	mock.restore();
	redis.get.mockImplementation(() => Promise.resolve(null));
	redis.set.mockImplementation(() => Promise.resolve());
	redis.del.mockImplementation(() => Promise.resolve(1));
	redis.keys.mockImplementation(() => Promise.resolve([]));
});
