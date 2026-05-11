import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { config } from "./config";
import { API_PREFIX, API_VERSION, APP_VERSION, AUTH_PREFIX, DOCS_PREFIX } from "./constants";
import { redis } from "./core/RedisClient";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";
import { configRoutes } from "./routes/config";
import { dashboardRoutes } from "./routes/dashboard";

const app = new OpenAPIHono({ strict: false });

// OpenAPI specs
app.doc(`${DOCS_PREFIX}/openapi.json`, {
	openapi: "3.0.0",
	info: {
		version: APP_VERSION,
		title: `toknd — Auth Broker API ${API_VERSION}`,
		description: `Centralized token management and OAuth2 broker service (${API_VERSION}).`,
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
	DOCS_PREFIX,
	Scalar({
		theme: "solarized",
		url: `${DOCS_PREFIX}/openapi.json`,
	}),
);
app.get("/docs", (c) => c.redirect(DOCS_PREFIX));
app.get("/api", (c) => c.redirect(DOCS_PREFIX));

app.use("*", logger());
app.use("*", prettyJSON());

app.get("/", (c) => c.redirect("/app"));

app.get("/app/dashboard.js", serveStatic({ path: "./src/views/dashboard.js" }));
app.route(AUTH_PREFIX, authRoutes);
app.route(`${API_PREFIX}/config`, configRoutes);
app.route(API_PREFIX, apiRoutes);
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
