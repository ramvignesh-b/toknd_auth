import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";

const dashboardRoutes = new Hono();

dashboardRoutes.get("/", async (c) => {
	try {
		const htmlPath = join(process.cwd(), "src/views/dashboard.html");
		const html = await readFile(htmlPath, "utf-8");
		return c.html(html);
	} catch (_error) {
		return c.text("Error loading dashboard", 500);
	}
});

export { dashboardRoutes };
