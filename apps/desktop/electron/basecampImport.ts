import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { IpcMain } from "electron";

export type BasecampComment = {
	author: string;
	date: string;
	html: string;
};

export type BasecampFetchResult = {
	ok: boolean;
	title?: string;
	html?: string;
	/** Present when the recording is a thread parent (a message/card/document with replies). */
	comments?: BasecampComment[];
	error?: string;
};

export type BasecampSearchItem = {
	id: number;
	title: string;
	type: string;
	url: string;
	projectName?: string;
	creatorName?: string;
	/** > 0 marks a thread parent whose whole conversation can be pulled in. */
	commentsCount?: number;
	parent?: { id: number; title: string; type: string; url: string };
};

export type BasecampSearchResult =
	| { ok: true; items: BasecampSearchItem[] }
	| { ok: false; error: string };

// GUI apps don't inherit the shell PATH, so resolve the `basecamp` binary from
// an override, the common install locations, then fall back to PATH.
function resolveBasecampBin(): string {
	if (process.env.SUDOMD_BASECAMP_BIN) return process.env.SUDOMD_BASECAMP_BIN;
	const candidates = [
		path.join(os.homedir(), ".local", "bin", "basecamp"),
		"/opt/homebrew/bin/basecamp",
		"/usr/local/bin/basecamp",
		"/usr/bin/basecamp",
	];
	for (const candidate of candidates) {
		try {
			fs.accessSync(candidate, fs.constants.X_OK);
			return candidate;
		} catch {
			// try the next candidate
		}
	}
	return "basecamp";
}

function runBasecampText(args: string[]): Promise<string | null> {
	return new Promise((resolve) => {
		execFile(
			resolveBasecampBin(),
			args,
			{ maxBuffer: 1024 * 1024 },
			(error, stdout) => resolve(error || !stdout ? null : stdout.trim()),
		);
	});
}

// The CLI holds the OAuth token; the public API's `search.json` is the only
// working full-text search (the CLI's own `search` command ignores the query).
async function basecampApiContext(): Promise<{
	token: string;
	baseUrl: string;
	accountId: string;
} | null> {
	const [token, configRaw] = await Promise.all([
		runBasecampText(["auth", "token"]),
		runBasecampText(["config", "show", "--json"]),
	]);
	if (!token || !configRaw) return null;
	try {
		const config = JSON.parse(configRaw)?.data ?? {};
		const accountId = String(config.account_id?.value ?? "");
		const baseUrl = String(
			config.base_url?.value ?? "https://3.basecampapi.com",
		).replace(/\/$/, "");
		if (!accountId) return null;
		return { token, baseUrl, accountId };
	} catch {
		return null;
	}
}

function runBasecampJson(
	args: string[],
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
	return new Promise((resolve) => {
		execFile(
			resolveBasecampBin(),
			args,
			{ maxBuffer: 16 * 1024 * 1024 },
			(error, stdout) => {
				if (!stdout) {
					resolve({
						ok: false,
						error: error
							? `Could not run basecamp CLI: ${error.message}`
							: "No response from Basecamp",
					});
					return;
				}
				try {
					const parsed = JSON.parse(stdout);
					if (!parsed.ok) {
						resolve({ ok: false, error: parsed.error ?? "Basecamp error" });
						return;
					}
					resolve({ ok: true, data: parsed.data });
				} catch {
					resolve({ ok: false, error: "Failed to parse Basecamp response" });
				}
			},
		);
	});
}

/**
 * Fetch a Basecamp recording (message/document/comment/card) by URL as rich
 * HTML. When the recording is a thread parent with replies, its comments are
 * pulled too so the whole conversation can be inserted in one clean block.
 */
export async function fetchBasecamp(url: string): Promise<BasecampFetchResult> {
	const result = await runBasecampJson(["show", url, "--json"]);
	if (!result.ok) return { ok: false, error: result.error };
	const data = (result.data ?? {}) as Record<string, unknown>;
	const base: BasecampFetchResult = {
		ok: true,
		title: String(data.subject ?? data.title ?? data.name ?? ""),
		html: String(data.content ?? ""),
	};
	const commentsUrl =
		typeof data.comments_url === "string" ? data.comments_url : "";
	if (!commentsUrl || Number(data.comments_count ?? 0) < 1) return base;
	const comments = await fetchAllComments(commentsUrl);
	return comments.length ? { ...base, comments } : base;
}

function nextLink(header: string | null): string {
	return header?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? "";
}

// Comments paginate (Link: rel="next"); walk every page, capped so a runaway
// thread can't stall the insert.
async function fetchAllComments(
	commentsUrl: string,
): Promise<BasecampComment[]> {
	const ctx = await basecampApiContext();
	if (!ctx) return [];
	const rows: unknown[] = [];
	let next = commentsUrl;
	try {
		while (next && rows.length < 500) {
			const res = await fetch(next, {
				headers: {
					Authorization: `Bearer ${ctx.token}`,
					"User-Agent": "Sudomd (support@sudomd)",
				},
			});
			if (!res.ok) break;
			const page = await res.json();
			if (Array.isArray(page)) rows.push(...page);
			next = nextLink(res.headers.get("link"));
		}
	} catch {
		return [];
	}
	return rows.map((row) => {
		const c = (row ?? {}) as Record<string, unknown>;
		const creator = c.creator as { name?: unknown } | undefined;
		return {
			author: String(creator?.name ?? ""),
			date: String(c.created_at ?? ""),
			html: String(c.content ?? ""),
		};
	});
}

// `show` resolves an API (basecampapi.com) recording URL; an external `url`
// (e.g. a Google Doc's drive link) is not fetchable, so fall back to app_url.
function showableUrl(url: unknown, appUrl: unknown): string {
	const api = String(url ?? "");
	if (api.includes("basecampapi.com")) return api;
	return String(appUrl ?? api);
}

/** Search across all Basecamp content, returning items with their parent recordings. */
export async function searchBasecamp(
	query: string,
	limit = 20,
): Promise<BasecampSearchResult> {
	const trimmed = query.trim();
	if (!trimmed) return { ok: true, items: [] };

	const ctx = await basecampApiContext();
	if (!ctx) {
		return {
			ok: false,
			error: "Not signed in to the Basecamp CLI. Run `basecamp auth login`.",
		};
	}

	let rows: unknown[];
	try {
		const res = await fetch(
			`${ctx.baseUrl}/${ctx.accountId}/search.json?q=${encodeURIComponent(trimmed)}`,
			{
				headers: {
					Authorization: `Bearer ${ctx.token}`,
					"User-Agent": "Sudomd (support@sudomd)",
				},
			},
		);
		if (!res.ok) {
			return { ok: false, error: `Basecamp search failed (${res.status})` };
		}
		const body = await res.json();
		rows = Array.isArray(body) ? body : [];
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Basecamp search failed",
		};
	}

	const items = rows.slice(0, limit).map((row): BasecampSearchItem => {
		const item = (row ?? {}) as Record<string, unknown>;
		const bucket = item.bucket as { name?: unknown } | undefined;
		const creator = item.creator as { name?: unknown } | undefined;
		const parent = item.parent as
			| {
					id?: unknown;
					title?: unknown;
					type?: unknown;
					url?: unknown;
					app_url?: unknown;
			  }
			| undefined;
		return {
			id: Number(item.id),
			title: String(item.title ?? "Untitled"),
			type: String(item.type ?? ""),
			url: showableUrl(item.url, item.app_url),
			projectName: bucket?.name ? String(bucket.name) : undefined,
			creatorName: creator?.name ? String(creator.name) : undefined,
			commentsCount: Number(item.comments_count ?? 0) || undefined,
			parent:
				parent?.url || parent?.app_url
					? {
							id: Number(parent.id),
							title: String(parent.title ?? ""),
							type: String(parent.type ?? ""),
							url: showableUrl(parent.url, parent.app_url),
						}
					: undefined,
		};
	});
	return { ok: true, items };
}

export function registerBasecampIpc(ipcMain: IpcMain) {
	ipcMain.handle("desktop:basecamp-fetch", (_event, { url }: { url: string }) =>
		fetchBasecamp(url),
	);
	ipcMain.handle(
		"desktop:basecamp-search",
		(_event, { query }: { query: string }) => searchBasecamp(query),
	);
}
