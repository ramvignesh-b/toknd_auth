import { z } from "zod";

const configSchema = z.object({
	APP_PORT: z.string().default("3000"),
	REDIS_HOST: z.string().default("redis"),
	REDIS_PORT: z.coerce.number().default(6379),
	API_KEY: z.string(),
});

export const config = configSchema.parse(process.env);
