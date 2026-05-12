import { API_VERSION, APP_VERSION } from "./constants";

export const openApiSpec = {
	openapi: "3.0.0",
	info: {
		version: `${API_VERSION}.${APP_VERSION}`,
		title: "toknd Auth Broker API",
		description:
			"A high-performance OAuth2 broker and token management service with multi-tenancy support. Designed to centralize provider configurations and automate token lifecycle management across distributed systems, securely isolated by Tenant IDs.",
	},
	tags: [
		{
			name: "Tokens",
			description: "Endpoint operations for accessing and force-refreshing active provider tokens.",
		},
		{
			name: "Management",
			description: "Administrative operations for provider lifecycle and configuration.",
		},
		{
			name: "Auth (Internal)",
			description: "System-level OAuth2 handshake and callback processing.",
		},
	],
	security: [{ API_KEY: [], TENANT_ID: [] }],
};

export const securityScheme = {
	type: "http",
	scheme: "bearer",
} as const;

export const tenantIdScheme = {
	type: "apiKey",
	in: "header",
	name: "X-Tenant-ID",
	description: "The unique identifier for the tenant (user or organization).",
} as const;
