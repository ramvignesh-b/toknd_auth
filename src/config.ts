import { z } from "zod";

const configSchema = z.object({
	PORT: z.string().default("3000"),
	REDIS_URL: z.string(),
	API_KEY: z.string(),
});

export const config = configSchema.parse(process.env);
