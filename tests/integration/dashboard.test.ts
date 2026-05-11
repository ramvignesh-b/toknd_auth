// @ts-nocheck
import { describe, expect, it } from "bun:test";
import { redis } from "../../src/core/RedisClient";
import { app } from "../../src/index";

describe("Dashboard & Common Integration", () => {
	it("should serve the dashboard HTML", async () => {
		const res = await app.request("/app");

		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("text/html");
		const html = await res.text();
		expect(html).toContain("<!DOCTYPE html>");
	});

	it("should return 404 with custom handler for unknown routes", async () => {
		const res = await app.request("/unknown-route");

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe("Not Found");
	});

	it("should return 500 for internal errors", async () => {
		redis.keys.mockImplementationOnce(() => {
			throw new Error("Redis Crash");
		});

		const res = await app.request("/api/status", {
			headers: { Authorization: "Bearer test-api-key" },
		});

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe("Internal Server Error");
	});
});
