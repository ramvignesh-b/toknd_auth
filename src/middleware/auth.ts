import type { Context, Next } from "hono";
import { config } from "../config";

export const authMiddleware = async (c: Context, next: Next) => {
	const authHeader = c.req.header("Authorization");

	if (!authHeader?.startsWith("Bearer ")) {
		return c.json({ error: "Missing or invalid authorization header" }, 401);
	}

	const token = authHeader.split(" ")[1];

	if (token !== config.API_KEY) {
		return c.json({ error: "Invalid API key" }, 403);
	}

	await next();
};
