document.addEventListener("alpine:init", () => {
	const formatTime = (timestamp) => {
		if (!timestamp) return "Never";
		const date = new Date(timestamp);
		const diff = Math.floor((Date.now() - date) / 1000);

		if (diff < 60) return "Just now";
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return date.toLocaleDateString();
	};

	window.Alpine.data("dashboard", ({ initialIsUnlocked }) => ({
		apiKey: "",
		isUnlocked: initialIsUnlocked,
		loading: false,
		providers: [],
		form: {
			providerName: "",
			clientId: "",
			clientSecret: "",
			authUrl: "",
			tokenUrl: "",
			scope: "public",
		},
		notification: {
			show: false,
			message: "",
			type: "success",
		},

		init() {
			if (this.isUnlocked) {
				this.fetchProviders();
			}
		},

		async unlock() {
			if (!this.apiKey) return;
			this.loading = true;
			try {
				const res = await fetch("/app/unlock", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ apiKey: this.apiKey }),
				});

				if (!res.ok) throw new Error("Invalid API Key");

				this.isUnlocked = true;
				await this.fetchProviders();
				this.apiKey = ""; // Clear after success
			} catch (err) {
				this.showNotification(err.message, "error");
				this.isUnlocked = false;
			} finally {
				this.loading = false;
			}
		},

		async logout() {
			this.loading = true;
			try {
				await fetch("/app/logout", { method: "POST" });
				this.isUnlocked = false;
				this.providers = [];
				this.showNotification("Logged out successfully");
			} catch (err) {
				this.showNotification(`Logout failed: ${err.message}`, "error");
			} finally {
				this.loading = false;
			}
		},

		async fetchProviders() {
			this.loading = true;
			try {
				const [configRes, statusRes] = await Promise.all([
					fetch("/api/v1/config"),
					fetch("/api/v1/status"),
				]);

				if (configRes.status === 401 || statusRes.status === 401) {
					return this.handleSessionExpired();
				}

				if (!configRes.ok || !statusRes.ok) throw new Error("Failed to fetch data");

				const [config, status] = await Promise.all([configRes.json(), statusRes.json()]);
				this.providers = this.mapProviders(config, status);
			} catch (err) {
				this.showNotification(err.message, "error");
			} finally {
				this.loading = false;
			}
		},

		mapProviders(config, status) {
			return Object.entries(config).map(([name, cfg]) => ({
				name,
				config: cfg,
				status: status[name] || { accessToken: null, refreshToken: null, lastUpdated: null },
			}));
		},

		handleSessionExpired() {
			this.isUnlocked = false;
			this.providers = [];
			this.showNotification("Session expired", "error");
		},

		async saveConfig() {
			this.loading = true;
			try {
				const res = await fetch(`/api/v1/config/${this.form.providerName}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(this.form),
				});

				if (res.status === 401) {
					this.isUnlocked = false;
					throw new Error("Session expired");
				}

				if (!res.ok) throw new Error("Failed to save");

				this.showNotification("Saved successfully");
				await this.fetchProviders();

				this.form = {
					providerName: "",
					clientId: "",
					clientSecret: "",
					authUrl: "",
					tokenUrl: "",
					scope: "public",
				};
			} catch (err) {
				this.showNotification(err.message, "error");
			} finally {
				this.loading = false;
			}
		},

		async forceRefresh(name) {
			this.loading = true;
			try {
				const res = await fetch(`/api/v1/refresh/${name}`, {
					method: "POST",
				});

				if (res.status === 401) {
					return this.handleSessionExpired();
				}

				if (!res.ok) throw new Error("Refresh failed");

				this.showNotification(`Refreshed ${name}`);
				await this.fetchProviders();
			} catch (err) {
				this.showNotification(err.message, "error");
			} finally {
				this.loading = false;
			}
		},

		async deleteProvider(name) {
			if (
				!confirm(
					`Are you sure you want to delete ${name}? This will also remove all associated tokens.`,
				)
			)
				return;

			this.loading = true;
			try {
				const res = await fetch(`/api/v1/config/${name}`, {
					method: "DELETE",
				});

				if (res.status === 401) {
					return this.handleSessionExpired();
				}

				if (!res.ok) throw new Error("Delete failed");

				this.showNotification(`Deleted ${name}`);
				await this.fetchProviders();
			} catch (err) {
				this.showNotification(err.message, "error");
			} finally {
				this.loading = false;
			}
		},

		editProvider(provider) {
			this.form = {
				providerName: provider.name,
				clientId: provider.config.clientId,
				clientSecret: provider.config.clientSecret,
				authUrl: provider.config.authUrl,
				tokenUrl: provider.config.tokenUrl,
				scope: provider.config.scope,
			};
			window.scrollTo({ top: 0, behavior: "smooth" });
		},

		getRedirectUri() {
			return `${window.location.origin}/v1/auth/${this.form.providerName || "{provider}"}/callback`;
		},

		copyToClipboard(text) {
			if (!text) return;
			navigator.clipboard.writeText(text).then(() => {
				this.showNotification("Copied");
			});
		},

		showNotification(message, type = "success") {
			this.notification = { show: true, message, type };
			setTimeout(() => {
				this.notification.show = false;
			}, 3000);
		},

		formatTime(timestamp) {
			return formatTime(timestamp);
		},
	}));
});
