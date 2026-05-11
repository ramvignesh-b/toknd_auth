import { mock } from "bun:test";

// Global test setup to stub environment variables
process.env.API_KEY = "test-api-key";
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";
process.env.APP_PORT = "3000";

// Global Redis mock
mock.module("../src/core/RedisClient", () => ({
	redis: {
		status: "ready",
		get: mock(() => Promise.resolve(null)),
		set: mock(() => Promise.resolve()),
		keys: mock(() => Promise.resolve([])),
		on: mock(() => {}),
	},
}));
