/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { html } from "hono/html";
import type { Child } from "hono/jsx";
import { config } from "../config";

const dashboardRoutes = new Hono({ strict: false });

export const Layout = (props: { title: string; children: Child; isUnlocked?: boolean }) => (
	<>
		{html`<!DOCTYPE html>`}
		<html lang="en" data-theme="abyss">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{props.title}</title>
				<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
				<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
				<link
					href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css"
					rel="stylesheet"
					type="text/css"
				/>
				<script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
				<link
					href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
					rel="stylesheet"
				/>
				<style>
					{`
						.font-mono {
							font-family: "DM Mono", monospace;
						}
					`}
				</style>
			</head>
			<body
				class="bg-base-200/50 min-h-screen font-['DM_Sans',sans-serif] antialiased text-base-content tracking-tight"
				x-data={`dashboard({ initialIsUnlocked: ${props.isUnlocked || false} })`}
			>
				{props.children}
				<script src="/app/dashboard.js"></script>
				<script src="//unpkg.com/alpinejs@3" defer></script>
			</body>
		</html>
	</>
);

export const Dashboard = (props: { isUnlocked: boolean }) => (
	<Layout title="toknd — Auth Broker Dashboard" isUnlocked={props.isUnlocked}>
		<div class="navbar bg-base-100 shadow-sm px-4 md:px-8 border-b border-base-300">
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-content font-semibold text-lg">
						<i class="ph-duotone ph-fingerprint"></i>
					</div>
					<div class="text-xl font-semibold tracking-tight">
						toknd <span class="text-xs font-normal opacity-50 ml-1">auth broker</span>
					</div>
				</div>
			</div>
			<div class="flex-none hidden sm:flex">
				<div class="join border border-base-200/50 bg-base-200/50 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
					<div class="join-item flex items-center px-4 bg-base-200">
						<i class="ph-duotone ph-key text-secondary text-lg"></i>
					</div>
					<div class="relative flex-1" x-data="{ show: false }">
						<input
							x-bind:type="show ? 'text' : 'password'"
							id="apiKey"
							name="apiKey"
							x-model="apiKey"
							aria-label="Master API Key"
							placeholder="API_KEY"
							class="input join-item input-sm bg-transparent border-none focus:outline-none w-48 lg:w-64 text-xs pr-10 font-mono"
						/>
						<button
							type="button"
							x-on:click="show = !show"
							class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square"
						>
							<i x-bind:class="show ? 'ph-duotone ph-eye-slash text-base opacity-50' : 'ph-duotone ph-eye text-base opacity-50'"></i>
						</button>
					</div>
					<button
						x-on:click="unlock()"
						type="submit"
						class="btn btn-primary btn-sm join-item px-6"
						x-bind:disabled="loading"
					>
						<i class="ph-duotone ph-lock-key-open text-lg" x-show="!loading"></i>
						<span class="loading loading-spinner loading-xs" x-show="loading"></span>
						<span class="ml-1 hidden md:inline" x-text="loading ? 'Unlocking...' : 'Unlock'"></span>
					</button>
					<button
						x-show="isUnlocked"
						x-on:click="logout()"
						type="button"
						class="btn btn-ghost btn-sm join-item text-error hover:bg-error/10"
					>
						<i class="ph-bold ph-power text-lg"></i>
					</button>
				</div>
			</div>
		</div>

		<div class="container mx-auto p-4 md:p-8 max-w-7xl">
			<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
				<div class="card bg-base-100 shadow-xl border border-base-300 lg:col-span-4 self-start">
					<div class="card-body p-6">
						<div class="flex items-center gap-2 mb-4">
							<div class="w-2 h-6 bg-primary rounded-full"></div>
							<h2 class="card-title text-xl font-semibold">Configure Provider</h2>
						</div>

						<form x-on:submit="saveConfig" class="space-y-4">
							<div class="form-control">
								<label htmlFor="providerName" class="label py-1">
									<span class="label-text flex items-center gap-2">
										Provider ID
										<span class="tooltip tooltip-top" data-tip="Internal name for this service.">
											<i class="ph ph-info opacity-50 cursor-help"></i>
										</span>
									</span>
								</label>
								<input
									type="text"
									id="providerName"
									x-model="form.providerName"
									placeholder="e.g. trakt"
									required
									class="input input-bordered w-full focus:input-primary"
								/>
							</div>

							<div class="divider text-xs opacity-50 my-2 uppercase tracking-widest">
								Credentials
							</div>

							<div class="form-control">
								<label htmlFor="clientId" class="label py-1">
									<span class="label-text">Client ID</span>
								</label>
								<input
									type="text"
									id="clientId"
									x-model="form.clientId"
									placeholder="OAuth client id"
									required
									class="input input-bordered w-full focus:input-primary"
								/>
							</div>
							<div class="form-control" x-data="{ show: false }">
								<label htmlFor="clientSecret" class="label py-1">
									<span class="label-text">Client Secret</span>
								</label>
								<div class="relative">
									<input
										x-bind:type="show ? 'text' : 'password'"
										id="clientSecret"
										x-model="form.clientSecret"
										placeholder="OAuth client secret"
										required
										class="input input-bordered w-full focus:input-primary pr-12"
									/>
									<button
										type="button"
										x-on:click="show = !show"
										class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square"
									>
										<i x-bind:class="show ? 'ph-duotone ph-eye-slash text-lg opacity-40' : 'ph-duotone ph-eye text-lg opacity-40'"></i>
									</button>
								</div>
							</div>

							<div class="divider text-xs opacity-50 my-2 uppercase tracking-widest">Endpoints</div>

							<div class="form-control">
								<label htmlFor="authUrl" class="label py-1">
									<span class="label-text">Auth URL</span>
								</label>
								<input
									type="url"
									id="authUrl"
									x-model="form.authUrl"
									placeholder="https://trakt.tv/oauth/authorize"
									required
									class="input input-bordered w-full focus:input-primary"
								/>
							</div>
							<div class="form-control">
								<label htmlFor="tokenUrl" class="label py-1">
									<span class="label-text">Token URL</span>
								</label>
								<input
									type="url"
									id="tokenUrl"
									x-model="form.tokenUrl"
									placeholder="https://api.trakt.tv/oauth/token"
									required
									class="input input-bordered w-full focus:input-primary"
								/>
							</div>
							<div class="form-control">
								<label htmlFor="redirectUri" class="label py-1">
									<span class="label-text">Redirect URI</span>
								</label>
								<div class="relative group">
									<input
										type="url"
										id="redirectUri"
										x-bind:value="getRedirectUri()"
										readonly
										class="input input-bordered w-full pr-12 focus:outline-none cursor-default opacity-80"
									/>
									<button
										type="button"
										x-on:click="copyToClipboard(getRedirectUri())"
										class="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-primary transition-colors"
									>
										<i class="ph-duotone ph-copy text-lg"></i>
									</button>
								</div>
								<div class="label py-0.5">
									<span class="label-text-alt opacity-40 italic text-xs">
										Must match provider's callback URL
									</span>
								</div>
							</div>
							<div class="form-control">
								<label htmlFor="scope" class="label py-1">
									<span class="label-text">Scope</span>
								</label>
								<input
									type="text"
									id="scope"
									x-model="form.scope"
									placeholder="public"
									class="input input-bordered w-full focus:input-primary"
								/>
							</div>

							<div class="card-actions pt-4">
								<button
									type="submit"
									class="btn btn-primary w-full shadow-md"
									x-bind:disabled="loading"
								>
									<i class="ph ph-plus-bold mr-1"></i>
									Save Configuration
								</button>
							</div>
						</form>
					</div>
				</div>

				<div class="card bg-base-100 shadow-xl border border-base-300 lg:col-span-8 overflow-hidden">
					<div class="card-body p-0">
						<div class="p-6 pb-4 flex justify-between items-center bg-base-100">
							<div class="flex items-center gap-2">
								<div class="w-2 h-6 bg-primary rounded-full"></div>
								<h2 class="card-title text-xl font-semibold">Provider Registry</h2>
							</div>
							<button
								type="button"
								x-on:click="fetchProviders()"
								class="btn btn-sm btn-base"
								x-bind:disabled="!isUnlocked || loading"
							>
								<i x-bind:class="loading ? 'ph ph-arrows-clockwise animate-spin mr-1' : 'ph ph-arrows-clockwise mr-1'"></i>
								Refresh List
							</button>
						</div>

						<div class="relative min-h-[400px]">
							<div
								x-show="loading && providers.length > 0"
								class="absolute inset-0 bg-base-100/50 backdrop-blur-md z-10 flex items-center justify-center"
							>
								<span class="loading loading-spinner loading-lg text-primary"></span>
							</div>

							<div x-show="!isUnlocked" class="p-20 text-center opacity-30">
								<div class="flex flex-col items-center gap-3">
									<i class="ph ph-lock-key text-6xl"></i>
									<p class="font-medium">Enter Master API Key to access registry</p>
								</div>
							</div>

							<div
								x-show="isUnlocked && providers.length === 0 && !loading"
								class="p-20 text-center opacity-30"
							>
								<div class="flex flex-col items-center gap-3">
									<i class="ph ph-folder-open text-6xl"></i>
									<p class="font-medium">No providers configured yet</p>
								</div>
							</div>

							<div
								x-show="isUnlocked && providers.length > 0"
								class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
							>
								<template x-for="provider in providers" x-bind:key="provider.name">
									<div class="card bg-base-200/50 border border-base-300 shadow-sm hover:shadow-md transition-all group">
										<div class="card-body p-5">
											<div class="flex flex-col mb-4">
												<span
													x-text="provider.name"
													class="text-lg font-black text-base-content/90 uppercase"
												></span>
												<span
													x-text="provider.config.clientId"
													x-bind:title="provider.config.clientId"
													class="text-xs opacity-40 truncate font-mono"
												></span>
											</div>

											<div class="space-y-4">
												<div x-data="{ show: false }">
													<div class="text-xs uppercase font-semibold opacity-30 block mb-1">
														Access Token
													</div>
													<div
														x-show="provider.status.accessToken"
														class="flex items-center gap-2 bg-base-100 rounded border border-base-300 p-1 pl-3"
													>
														<input
															x-bind:type="show ? 'text' : 'password'"
															x-bind:value="provider.status.accessToken"
															readonly
															class="bg-transparent border-none outline-none shadow-none focus:ring-0 text-xs flex-1 min-w-0 font-mono"
														/>
														<div class="flex gap-1">
															<button
																type="button"
																x-on:click="show = !show"
																class="btn btn-ghost btn-xs btn-square"
															>
																<i x-bind:class="show ? 'ph-duotone ph-eye-slash text-base opacity-50' : 'ph-duotone ph-eye text-base opacity-50'"></i>
															</button>
															<button
																type="button"
																x-on:click="copyToClipboard(provider.status.accessToken)"
																class="btn btn-ghost btn-xs btn-square"
															>
																<i class="ph-duotone ph-copy-simple text-base opacity-50"></i>
															</button>
														</div>
													</div>
													<div
														x-show="!provider.status.accessToken"
														class="h-8 flex items-center px-3 bg-base-300/30 rounded text-xs italic opacity-40"
													>
														Not Authenticated
													</div>
												</div>

												<div x-data="{ show: false }">
													<div class="text-xs uppercase font-semibold opacity-30 block mb-1">
														Refresh Token
													</div>
													<div
														x-show="provider.status.refreshToken"
														class="flex items-center gap-2 bg-base-100 rounded border border-base-300 p-1 pl-3"
													>
														<input
															x-bind:type="show ? 'text' : 'password'"
															x-bind:value="provider.status.refreshToken"
															readonly
															class="bg-transparent border-none outline-none shadow-none focus:ring-0 text-xs flex-1 min-w-0 font-mono"
														/>
														<div class="flex gap-1">
															<button
																type="button"
																x-on:click="show = !show"
																class="btn btn-ghost btn-xs btn-square"
															>
																<i x-bind:class="show ? 'ph-duotone ph-eye-slash text-base opacity-50' : 'ph-duotone ph-eye text-base opacity-50'"></i>
															</button>
															<button
																type="button"
																x-on:click="copyToClipboard(provider.status.refreshToken)"
																class="btn btn-ghost btn-xs btn-square"
															>
																<i class="ph-duotone ph-copy-simple text-base opacity-50"></i>
															</button>
														</div>
													</div>
													<div
														x-show="!provider.status.refreshToken"
														class="h-8 flex items-center px-3 bg-base-300/30 rounded text-xs italic opacity-40"
													>
														Not Authenticated
													</div>
												</div>
											</div>

											<div class="divider my-3 opacity-10"></div>
											<div class="flex justify-between items-center mb-4">
												<span class="text-xs font-semibold opacity-30 uppercase">Last Updated</span>
												<span
													x-text="formatTime(provider.status.lastUpdated)"
													class="text-xs font-medium opacity-60"
												></span>
											</div>

											<div class="flex flex-col gap-2">
												<div class="grid grid-cols-2 gap-2">
													<button
														type="button"
														x-on:click="window.open('/auth/' + provider.name + '/login', '_blank')"
														class="btn btn-primary btn-sm"
													>
														<i class="ph-bold ph-link"></i> Connect
													</button>
													<button
														type="button"
														x-on:click="editProvider(provider)"
														class="btn btn-secondary btn-sm"
													>
														<i class="ph-bold ph-pencil-simple"></i> Edit
													</button>
												</div>
												<button
													type="button"
													x-on:click="forceRefresh(provider.name)"
													class="btn btn-base w-full"
													x-bind:disabled="loading"
												>
													<i class="ph-bold ph-arrows-clockwise text-base mr-1"></i>
													<span class="text-xs uppercase font-bold tracking-widest">
														Refresh Tokens
													</span>
												</button>
											</div>
										</div>
									</div>
								</template>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="toast toast-center toast-top z-100" x-show="notification.show">
			<div
				class="alert shadow-lg border border-base-300"
				x-bind:class="notification.type === 'error' ? 'alert-error' : 'alert-success'"
			>
				<span x-text="notification.message"></span>
			</div>
		</div>
	</Layout>
);

export const Success = (props: { provider: string }) => (
	<Layout title="Authenticated!">
		<div class="min-h-[80vh] flex items-center justify-center p-4">
			<div class="card bg-base-100 shadow-xl border border-base-300 max-w-md w-full">
				<div class="card-body items-center text-center p-8 md:p-12">
					<div class="w-20 h-20 bg-success/10 text-success rounded-2xl flex items-center justify-center mb-6 shadow-inner animate-pulse-slow">
						<i class="ph-duotone ph-check-circle text-5xl"></i>
					</div>

					<h2 class="card-title text-3xl font-black tracking-tight mb-2 uppercase">
						Authenticated!
					</h2>
					<p class="text-base-content/60 leading-relaxed">
						Successfully connected to{" "}
						<span class="font-bold text-base-content uppercase">{props.provider}</span>. You can now
						close this window or return to the dashboard.
					</p>

					<div class="divider my-8 opacity-50"></div>

					<div class="card-actions w-full">
						<a
							href="/app"
							class="btn btn-primary btn-block shadow-lg hover:shadow-primary/20 transition-all"
						>
							<i class="ph-bold ph-house mr-2"></i>
							Back to Dashboard
						</a>
					</div>
				</div>
			</div>
		</div>
	</Layout>
);

dashboardRoutes.get("/", async (c) => {
	const isUnlocked = getCookie(c, "toknd_api_key") === config.API_KEY;
	return c.html(<Dashboard isUnlocked={isUnlocked} />);
});

dashboardRoutes.post("/unlock", async (c) => {
	const { apiKey } = await c.req.json();
	if (apiKey !== config.API_KEY) {
		return c.json({ error: "Invalid API Key" }, 401);
	}
	setCookie(c, "toknd_api_key", apiKey, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		path: "/",
		maxAge: 60 * 60 * 24 * 7, // 1 week
	});
	return c.json({ success: true });
});

dashboardRoutes.post("/logout", async (c) => {
	deleteCookie(c, "toknd_api_key", { path: "/" });
	return c.json({ success: true });
});

dashboardRoutes.get("/success", async (c) => {
	const provider = c.req.query("provider") || "Provider";
	return c.html(<Success provider={provider} />);
});

export { dashboardRoutes };
