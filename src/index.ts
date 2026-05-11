import { Hono } from "hono";
import { config } from "./config";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";
import { configRoutes } from "./routes/config";
import { dashboardRoutes } from "./routes/dashboard";

const app = new Hono();

app.use("*", async (c, next) => {
	console.log(`${c.req.method} ${c.req.url}`);
	await next();
});

app.route("/auth", authRoutes);
app.route("/api/config", configRoutes);
app.route("/api", apiRoutes);
app.route("/dashboard", dashboardRoutes);

app.get("/health", (c) => c.json({ status: "ok" }));
export default {
	port: Number.parseInt(config.PORT, 10),
	fetch: app.fetch,
};
