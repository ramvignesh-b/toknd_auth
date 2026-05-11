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
app.doc("/docs/v1/openapi.json", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "toknd — Auth Broker API v1",
		description: "Centralized token management and OAuth2 broker service (v1).",
	},
	tags: [
		{ name: "Tokens", description: "Standard API for retrieving and refreshing provider tokens." },
		{ name: "Management", description: "Administrative API for managing provider configurations." },
		{
			name: "Auth (Internal)",
			description:
				"**NOTE: YOU MIGHT NOT HAVE TO USE THESE** These endpoints manage the OAuth2 flow and are orchestrated by the system.",
		},
	],
});

app.openAPIRegistry.registerComponent("securitySchemes", "API_KEY", {
	type: "http",
	scheme: "bearer",
});

// Scalar API Reference
app.get(
	"/docs/v1",
	Scalar({
		theme: "solarized",
		url: "/docs/v1/openapi.json",
	}),
);
app.get("/docs", (c) => c.redirect("/docs/v1"));
app.get("/api", (c) => c.redirect("/docs/v1"));

app.use("*", logger());
app.use("*", prettyJSON());

app.get("/", (c) => c.redirect("/app"));

app.get("/app/dashboard.js", serveStatic({ path: "./src/views/dashboard.js" }));
app.route("/v1/auth", authRoutes);
app.route("/api/v1/config", configRoutes);
app.route("/api/v1", apiRoutes);
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
