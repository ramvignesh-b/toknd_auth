import { mock } from "bun:test";

// Global test setup to stub environment variables
process.env.API_KEY = "test-api-key";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.PORT = "3000";

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
