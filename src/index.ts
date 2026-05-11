import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { config } from "./config";
import { redis } from "./core/RedisClient";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";
import { configRoutes } from "./routes/config";
import { dashboardRoutes } from "./routes/dashboard";

const app = new OpenAPIHono({ strict: false });

// OpenAPI specs
app.doc("/doc", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "toknd — Auth Broker API",
		description: "Centralized token management and OAuth2 broker service.",
	},
});

app.openAPIRegistry.registerComponent("securitySchemes", "API_KEY", {
	type: "http",
	scheme: "bearer",
});

// Scalar API Reference
app.get(
	"/api",
	Scalar({
		theme: "solarized",
		url: "/doc",
	}),
);
app.get("/docs", (c) => c.redirect("/api"));

app.use("*", logger());
app.use("*", prettyJSON());

app.get("/", (c) => c.redirect("/app"));

app.use("/app/*", serveStatic({ root: "./src/views" }));
app.route("/auth", authRoutes);
app.route("/api/config", configRoutes);
app.route("/api", apiRoutes);
app.route("/app", dashboardRoutes);

app.notFound((c) => {
	console.error(`[404 Not Found] ${c.req.method} ${c.req.url}`);
	return c.json(
		{
			error: "Not Found",
			method: c.req.method,
			path: c.req.path,
			suggestion: "Check your callback URL and ensure it matches the registered redirect URI.",
		},
		404,
	);
});

app.onError((err, c) => {
	console.error(`[Internal Server Error] ${err.message}`);
	return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

app.get("/health", async (c) => {
	if (redis.status !== "ready") {
		return c.json({ status: "error", message: "Redis down", redis: redis.status }, 503);
	}
	return c.json({ status: "ok" });
});

export { app };

export default {
	port: Number.parseInt(config.APP_PORT, 10),
	fetch: app.fetch,
};
