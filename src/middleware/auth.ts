import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { config } from "../config";

export const authMiddleware = async (c: Context, next: Next) => {
	const authHeader = c.req.header("Authorization");
	const cookieToken = getCookie(c, "toknd_api_key");

	let token: string | undefined;

	if (authHeader?.startsWith("Bearer ")) {
		token = authHeader.split(" ")[1];
	} else if (cookieToken) {
		token = cookieToken;
	}

	if (!token) {
		return c.json({ error: "Missing or invalid authorization" }, 401);
	}

	if (token !== config.API_KEY) {
		return c.json({ error: "Invalid API key" }, 403);
	}

	await next();
};
