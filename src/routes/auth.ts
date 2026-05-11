import { Hono } from "hono";
import { ConfigManager } from "../core/ConfigManager";
import { redis } from "../core/RedisClient";
import { TokenManager } from "../core/TokenManager";
import { GenericProvider } from "../providers/GenericProvider";

const authRoutes = new Hono({ strict: false });

authRoutes.get("/:provider/login", async (c) => {
	const providerName = c.req.param("provider");
	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json(
			{
				error: "Configuration Not Found",
				message: `Provider '${providerName}' is not configured.`,
			},
			404,
		);
	}

	const provider = new GenericProvider(providerName, providerConfig);

	const url = new URL(c.req.url);
	const redirectUri = providerConfig.redirectUri || `${url.origin}/auth/callback`;

	return c.redirect(provider.getAuthUrl(providerName, redirectUri));
});

authRoutes.get("/callback", async (c) => {
	const providerName = c.req.query("state");
	const code = c.req.query("code");

	if (!providerName || !code) {
		return c.json(
			{
				error: "Invalid Request",
				message: "Missing state (provider) or authorization code.",
			},
			400,
		);
	}

	const configManager = new ConfigManager(redis);
	const providerConfig = await configManager.getProviderConfig(providerName);

	if (!providerConfig) {
		return c.json(
			{
				error: "Configuration Not Found",
				message: `Provider '${providerName}' is not configured.`,
			},
			404,
		);
	}

	const url = new URL(c.req.url);
	const redirectUri = providerConfig.redirectUri || `${url.origin}/auth/callback`;

	const provider = new GenericProvider(providerName, providerConfig);
	const tokenManager = new TokenManager(redis, provider);

	try {
		const tokens = await provider.exchangeCode(code, redirectUri);
		await tokenManager.saveTokens(providerName, tokens);

		return c.html(`
			<!DOCTYPE html>
			<html data-theme="light">
			<head>
				<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
				<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
				<script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>
				<title>Authentication Successful</title>
			</head>
			<body class="bg-base-200 min-h-screen flex items-center justify-center p-4">
				<div class="card bg-base-100 shadow-xl max-w-md w-full border border-base-300">
					<div class="card-body items-center text-center">
						<div class="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
							<i class="ph ph-check-circle text-4xl"></i>
						</div>
						<h2 class="card-title text-2xl font-bold">Authenticated!</h2>
						<p class="opacity-70 mt-2">Successfully connected to <strong>${providerName}</strong>.</p>
						<div class="card-actions mt-6">
							<a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
						</div>
					</div>
				</div>
			</body>
			</html>
		`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
		console.error(`[OAuth Error] ${errorMessage}`);
		return c.json(
			{
				error: "Token Exchange Failed",
				message: errorMessage,
			},
			500,
		);
	}
});

export { authRoutes };
