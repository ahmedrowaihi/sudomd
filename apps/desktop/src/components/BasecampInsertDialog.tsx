import { basecampHtmlToMarkdown } from "@sudomd/editor";
import { Button, INSERT_MARKDOWN_EVENT, Input, Modal } from "@sudomd/ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import MingcuteCornerDownRightLine from "~icons/mingcute/corner-down-right-line";
import { desktopApi } from "../desktopApi";
import type {
	BasecampFetchResult,
	BasecampSearchItem,
} from "../desktopApi/types";

const SEARCH_DEBOUNCE_MS = 300;

function looksLikeUrl(value: string) {
	return /^https?:\/\//i.test(value.trim());
}

function friendlyType(type: string) {
	return type.replace(/^Kanban::/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatDate(iso: string) {
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? ""
		: date.toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
}

// Assemble the recording body and, for thread parents, every comment into one
// clean markdown block (heading → body → per-comment author/date → reply).
function buildThreadMarkdown(result: BasecampFetchResult) {
	const parts = [
		result.title ? `# ${result.title}` : "",
		basecampHtmlToMarkdown(result.html ?? ""),
	].filter(Boolean);
	const comments = result.comments ?? [];
	if (comments.length) {
		parts.push("---", `## Comments (${comments.length})`);
		for (const comment of comments) {
			const meta = [comment.author, formatDate(comment.date)]
				.filter(Boolean)
				.join(" · ");
			parts.push(
				[meta && `**${meta}**`, basecampHtmlToMarkdown(comment.html ?? "")]
					.filter(Boolean)
					.join("\n\n"),
			);
		}
	}
	return parts.join("\n\n");
}

export function BasecampInsertDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [query, setQuery] = useState("");
	const [items, setItems] = useState<BasecampSearchItem[]>([]);
	const [searching, setSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [insertingUrl, setInsertingUrl] = useState<string | null>(null);
	const requestSeq = useRef(0);

	// Reset when the dialog closes so it reopens clean.
	useEffect(() => {
		if (!open) {
			setQuery("");
			setItems([]);
			setError(null);
			setInsertingUrl(null);
		}
	}, [open]);

	const trimmed = query.trim();
	const isUrl = looksLikeUrl(trimmed);

	// Debounced search. A URL is treated as a direct link, not a query.
	useEffect(() => {
		if (isUrl || trimmed.length < 2) {
			setItems([]);
			setSearching(false);
			setError(null);
			return;
		}
		const seq = ++requestSeq.current;
		setSearching(true);
		const timer = window.setTimeout(async () => {
			try {
				const result = await desktopApi.searchBasecamp(trimmed);
				if (seq !== requestSeq.current) return;
				if (result.ok) {
					setItems(result.items);
					setError(null);
				} else {
					setItems([]);
					setError(result.error);
				}
			} catch {
				if (seq !== requestSeq.current) return;
				setItems([]);
				setError("Search failed");
			} finally {
				if (seq === requestSeq.current) setSearching(false);
			}
		}, SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [trimmed, isUrl]);

	async function insert(url: string, label?: string) {
		if (!url) return;
		setInsertingUrl(url);
		try {
			const result = await desktopApi.fetchBasecamp(url);
			if (!result.ok || !result.html) {
				toast.error("Couldn't fetch from Basecamp", {
					description: result.error,
				});
				return;
			}
			const markdown = buildThreadMarkdown(result);
			window.dispatchEvent(
				new CustomEvent(INSERT_MARKDOWN_EVENT, { detail: { markdown } }),
			);
			const count = result.comments?.length ?? 0;
			toast.success(`Inserted ${label ?? "from Basecamp"}`, {
				description:
					count > 0
						? `Pulled the whole thread — ${count} comment${count > 1 ? "s" : ""} included.`
						: undefined,
			});
			onOpenChange(false);
		} catch {
			toast.error("Failed to insert from Basecamp");
		} finally {
			setInsertingUrl(null);
		}
	}

	function onSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (isUrl) {
			void insert(trimmed, "from link");
			return;
		}
		const first = items[0];
		if (first) void insert(first.url, first.title);
	}

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Insert from Basecamp"
			description="Search Basecamp and pick an item, or paste a link. Its content is inserted at your cursor."
		>
			<form className="flex flex-col gap-3" onSubmit={onSubmit}>
				<Input
					autoFocus
					value={query}
					placeholder="Search Basecamp or paste a link…"
					onChange={(event) => setQuery(event.target.value)}
				/>

				{isUrl ? (
					<div className="flex justify-end">
						<Button type="submit" size="sm" disabled={insertingUrl === trimmed}>
							{insertingUrl === trimmed ? "Fetching…" : "Insert from link"}
						</Button>
					</div>
				) : (
					<div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
						{searching && (
							<p className="px-1 py-2 text-xs text-muted-foreground">
								Searching…
							</p>
						)}
						{!searching && error && (
							<p className="px-1 py-2 text-xs text-destructive">{error}</p>
						)}
						{!searching && !error && trimmed.length >= 2 && !items.length && (
							<p className="px-1 py-2 text-xs text-muted-foreground">
								No results for “{trimmed}”.
							</p>
						)}
						{items.map((item) => (
							<ResultRow
								key={`${item.type}-${item.id}`}
								item={item}
								busy={insertingUrl !== null}
								onInsert={insert}
							/>
						))}
					</div>
				)}
			</form>
		</Modal>
	);
}

function ResultRow({
	item,
	busy,
	onInsert,
}: {
	item: BasecampSearchItem;
	busy: boolean;
	onInsert: (url: string, label: string) => void;
}) {
	const commentCount = item.commentsCount ?? 0;
	const meta = [
		friendlyType(item.type),
		item.projectName,
		commentCount > 0 && `${commentCount} comment${commentCount > 1 ? "s" : ""}`,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<div className="flex flex-col rounded-sm border border-transparent hover:border-border hover:bg-accent/40">
			<button
				type="button"
				disabled={busy}
				onClick={() => onInsert(item.url, item.title)}
				className="flex w-full cursor-pointer flex-col gap-0.5 rounded-sm px-2 py-1.5 text-start outline-hidden disabled:opacity-50"
			>
				<span className="truncate text-xs font-medium">{item.title}</span>
				{meta && (
					<span className="truncate text-[11px] text-muted-foreground">
						{meta}
					</span>
				)}
			</button>
			{item.parent && (
				<button
					type="button"
					disabled={busy}
					onClick={() =>
						item.parent && onInsert(item.parent.url, item.parent.title)
					}
					className="flex w-full cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-start text-[11px] text-muted-foreground outline-hidden hover:text-foreground disabled:opacity-50"
					title={`Insert the whole ${friendlyType(item.parent.type)} instead`}
				>
					<MingcuteCornerDownRightLine className="size-3 shrink-0" />
					<span className="truncate">
						Insert parent: {item.parent.title || friendlyType(item.parent.type)}
					</span>
				</button>
			)}
		</div>
	);
}
