import { useStoreValue } from "@simplestack/store/react";
import { useEffect, useState } from "react";
import MingcuteLinkLine from "~icons/mingcute/link-line";
import { desktopApi } from "../desktopApi";
import { basename, dirname, relativeWorkspacePath } from "../lib/filePath";
import { resolveWikiPath } from "../lib/wikiPath";
import { loadPath } from "../store/actions";
import { workspaceStore } from "../store/state";

const WIKI_LINK = /\[\[([^\]\n|]+)(?:\|[^\]\n]*)?\]\]/g;
const MARKDOWN = /\.(md|markdown|mdown)$/i;

type Backlink = { path: string; name: string; folder: string };

function displayName(path: string): string {
	return basename(path).replace(MARKDOWN, "");
}

export function BacklinksPanel({ currentPath }: { currentPath: string }) {
	const workspace = useStoreValue(workspaceStore);
	const [backlinks, setBacklinks] = useState<Backlink[]>([]);
	const [open, setOpen] = useState(false);

	const files = workspace.files;
	const workspacePath = workspace.workspacePath;

	useEffect(() => {
		let cancelled = false;
		async function scan() {
			const results: Backlink[] = [];
			for (const file of files) {
				if (file.path === currentPath || !MARKDOWN.test(file.path)) continue;
				let content: string;
				try {
					content = await desktopApi.readFileText(file.path);
				} catch {
					continue;
				}
				if (cancelled) return;
				const linksHere = [...content.matchAll(WIKI_LINK)].some(
					(match) =>
						resolveWikiPath({
							target: match[1].trim(),
							files,
							workspacePath,
						}) === currentPath,
				);
				if (linksHere) {
					const relative = workspacePath
						? relativeWorkspacePath(file.path, workspacePath)
						: file.path;
					results.push({
						path: file.path,
						name: displayName(file.path),
						folder: dirname(relative) ?? "",
					});
				}
			}
			if (!cancelled) setBacklinks(results);
		}
		void scan();
		return () => {
			cancelled = true;
		};
	}, [currentPath, files, workspacePath]);

	if (backlinks.length === 0) return null;

	return (
		<div className="pointer-events-none absolute end-3 bottom-10 z-10 flex flex-col items-end gap-1">
			{open && (
				<nav className="pointer-events-auto max-h-[50vh] w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay">
					<p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
						Linked from
					</p>
					{backlinks.map((backlink) => (
						<button
							key={backlink.path}
							type="button"
							className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-start text-[11px] hover:bg-accent"
							title={backlink.path}
							onClick={() => void loadPath(backlink.path)}
						>
							<span className="truncate text-foreground">{backlink.name}</span>
							{backlink.folder && backlink.folder !== "." && (
								<span className="ms-auto truncate ps-2 text-muted-foreground">
									{backlink.folder}
								</span>
							)}
						</button>
					))}
				</nav>
			)}
			<button
				type="button"
				className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-overlay backdrop-blur-[2px] hover:text-foreground"
				aria-label={`${backlinks.length} backlinks`}
				onClick={() => setOpen((value) => !value)}
			>
				<MingcuteLinkLine className="size-3.5" />
				{backlinks.length}
			</button>
		</div>
	);
}
