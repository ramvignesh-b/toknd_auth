import { z } from "zod";

const configSchema = z.object({
	PORT: z.string(),
	REDIS_URL: z.string(),
	API_KEY: z.string(),
});

export const config = configSchema.parse(process.env);
