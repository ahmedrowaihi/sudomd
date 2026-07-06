(() => {
	const sudomdToken = window.__sudomdHtmlAppToken || window.name;
	let nextSudomdRequestId = 0;
	const pendingSudomdRequests = new Map();
	const postSudomdRequest = (id, method, params) => {
		parent.postMessage(
			{ type: "sudomd:request", id, method, params, token: sudomdToken },
			"*",
		);
	};
	const requestSudomd = (method, params) =>
		new Promise((resolve, reject) => {
			const id = ++nextSudomdRequestId;
			const timeout = window.setTimeout(() => {
				pendingSudomdRequests.delete(id);
				reject(new Error("Sudomd request timed out"));
			}, 10000);
			pendingSudomdRequests.set(id, { resolve, reject, timeout });
			postSudomdRequest(id, method, params);
		});
	const safeRequestSudomd = (method, params) =>
		requestSudomd(method, params)
			.then((value) => ({ ok: true, value }))
			.catch((error) => ({
				ok: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			}));

	window.addEventListener("message", (event) => {
		const data = event.data;
		if (!data || data.type !== "sudomd:response") return;
		const pending = pendingSudomdRequests.get(data.id);
		if (!pending) return;
		pendingSudomdRequests.delete(data.id);
		window.clearTimeout(pending.timeout);
		if (data.ok) pending.resolve(data.value);
		else if (data.error && typeof data.error.message === "string") {
			pending.reject(new Error(data.error.message));
		} else {
			pending.reject(new Error(data.error || "Sudomd request failed"));
		}
	});

	window.sudomd = {
		files: {
			list: (glob = "**/*") => requestSudomd("files.list", { glob }),
			safeList: (glob = "**/*") => safeRequestSudomd("files.list", { glob }),
			read: (path) => requestSudomd("files.read", { path }),
			safeRead: (path) => safeRequestSudomd("files.read", { path }),
			open: (path) => requestSudomd("files.open", { path }),
			safeOpen: (path) => safeRequestSudomd("files.open", { path }),
			create: (input) => requestSudomd("files.create", { input }),
			safeCreate: (input) => safeRequestSudomd("files.create", { input }),
			update: (path, patch) => requestSudomd("files.update", { path, patch }),
			safeUpdate: (path, patch) =>
				safeRequestSudomd("files.update", { path, patch }),
			remove: (path) => requestSudomd("files.remove", { path }),
			safeRemove: (path) => safeRequestSudomd("files.remove", { path }),
		},
	};

	const send = () => {
		const body = document.body;
		const bodyTop = body ? body.getBoundingClientRect().top : 0;
		const bodyPaddingBlockEnd = body
			? Number.parseFloat(getComputedStyle(body).paddingBlockEnd) || 0
			: 0;
		const height = body
			? Array.from(body.children).reduce((max, child) => {
					if (!(child instanceof HTMLElement)) return max;
					if (child.tagName === "SCRIPT" || child.tagName === "STYLE")
						return max;
					return Math.max(max, child.getBoundingClientRect().bottom - bodyTop);
				}, 0) + bodyPaddingBlockEnd
			: 0;
		parent.postMessage(
			{ type: "sudomd:html-app-height", height, token: sudomdToken },
			"*",
		);
	};
	const schedule = () => requestAnimationFrame(send);
	const resizeObserver = new ResizeObserver(schedule);
	let isObservingBody = false;
	const observeBody = () => {
		if (!document.body || isObservingBody) return;
		resizeObserver.observe(document.body);
		isObservingBody = true;
	};
	window.addEventListener("load", () => {
		observeBody();
		schedule();
	});
	resizeObserver.observe(document.documentElement);
	if (document.readyState === "loading") {
		document.addEventListener(
			"DOMContentLoaded",
			() => {
				observeBody();
				schedule();
			},
			{ once: true },
		);
	} else {
		observeBody();
	}
	schedule();
})();
