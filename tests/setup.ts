// @ts-nocheck
import { afterEach, mock } from "bun:test";
import { API_PREFIX, AUTH_PREFIX } from "../src/constants";

// Make prefixes global for easier testing
globalThis.API_PREFIX = API_PREFIX;
globalThis.AUTH_PREFIX = AUTH_PREFIX;

// Global test setup to stub environment variables
process.env.API_KEY = "test-api-key";
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";
process.env.APP_PORT = "3000";

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

import { redis } from "../src/core/RedisClient";

afterEach(() => {
	mock.restore();
	redis.get.mockImplementation(() => Promise.resolve(null));
	redis.set.mockImplementation(() => Promise.resolve());
	redis.del.mockImplementation(() => Promise.resolve(1));
	redis.keys.mockImplementation(() => Promise.resolve([]));
});
