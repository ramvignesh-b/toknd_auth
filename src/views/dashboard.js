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

	window.Alpine.data("dashboard", () => ({
		apiKey: localStorage.getItem("toknd_api_key") || "",
		isUnlocked: false,
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
			if (this.apiKey) {
				this.unlock();
			}
		},

		async unlock() {
			if (!this.apiKey) return;
			this.loading = true;
			try {
				localStorage.setItem("toknd_api_key", this.apiKey);
				await this.fetchProviders();
				this.isUnlocked = true;
			} catch (err) {
				this.showNotification(`Failed to unlock: ${err.message}. Check your API Key`, "error");
				localStorage.removeItem("toknd_api_key");
				this.isUnlocked = false;
				this.apiKey = "";
			} finally {
				this.loading = false;
			}
		},

		async fetchProviders() {
			this.loading = true;
			try {
				const [configRes, statusRes] = await Promise.all([
					fetch("/api/config", { headers: { Authorization: `Bearer ${this.apiKey}` } }),
					fetch("/api/status", { headers: { Authorization: `Bearer ${this.apiKey}` } }),
				]);

				if (!configRes.ok || !statusRes.ok) throw new Error("Unauthorized");

				const config = await configRes.json();
				const status = await statusRes.json();

				this.providers = Object.entries(config).map(([name, cfg]) => ({
					name,
					config: cfg,
					status: status[name] || { accessToken: null, refreshToken: null, lastUpdated: null },
				}));
			} catch (err) {
				this.showNotification(err.message, "error");
				throw err;
			} finally {
				this.loading = false;
			}
		},

		async saveConfig(event) {
			if (event) event.preventDefault();
			this.loading = true;
			try {
				const res = await fetch(`/api/config/${this.form.providerName}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${this.apiKey}`,
					},
					body: JSON.stringify(this.form),
				});

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
				const res = await fetch(`/api/refresh/${name}`, {
					method: "POST",
					headers: { Authorization: `Bearer ${this.apiKey}` },
				});

				if (!res.ok) throw new Error("Refresh failed");

				this.showNotification(`Refreshed ${name}`);
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
			return `${window.location.origin}/auth/${this.form.providerName || "{provider}"}/callback`;
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
