import { Dialog } from "@base-ui/react/dialog";
import { useStoreValue } from "@simplestack/store/react";
import { Command } from "cmdk";
import { useState } from "react";
import MingcuteFileLine from "~icons/mingcute/file-line";
import { basename, dirname, relativeWorkspacePath } from "../lib/filePath";
import { loadPath } from "../store/actions";
import { workspacePathStore, workspaceStore } from "../store/state";

function displayName(path: string): string {
	return basename(path).replace(/\.(md|markdown|mdown|txt|html)$/i, "");
}

export function QuickSwitcher({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const files = useStoreValue(workspaceStore).files;
	const workspacePath = useStoreValue(workspacePathStore);
	const [query, setQuery] = useState("");

	const items = [...files]
		.sort((a, b) => b.modified_at - a.modified_at)
		.map((file) => {
			const relative = workspacePath
				? relativeWorkspacePath(file.path, workspacePath)
				: file.path;
			return {
				path: file.path,
				name: displayName(file.path),
				folder: dirname(relative) ?? "",
			};
		});

	function select(path: string) {
		onOpenChange(false);
		setQuery("");
		void loadPath(path);
	}

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) setQuery("");
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
				<Dialog.Popup className="fixed top-24 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-overlay outline-hidden transition-[transform,opacity] duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
					<Dialog.Title className="sr-only">Go to note</Dialog.Title>
					<Command label="Go to note" className="flex flex-col">
						<Command.Input
							autoFocus
							value={query}
							onValueChange={setQuery}
							placeholder="Go to note…"
							className="h-11 w-full border-b border-border bg-transparent px-3 text-sm outline-hidden placeholder:text-muted-foreground"
						/>
						<Command.List className="max-h-80 overflow-y-auto p-1">
							<Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
								No notes found
							</Command.Empty>
							{items.map((item) => (
								<Command.Item
									key={item.path}
									value={`${item.name} ${item.folder} ${item.path}`}
									onSelect={() => select(item.path)}
									className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden select-none data-[selected=true]:bg-accent"
								>
									<MingcuteFileLine className="size-3.5 shrink-0 text-muted-foreground" />
									<span className="truncate text-foreground">{item.name}</span>
									{item.folder && item.folder !== "." && (
										<span className="ms-auto truncate ps-2 text-[11px] text-muted-foreground">
											{item.folder}
										</span>
									)}
								</Command.Item>
							))}
						</Command.List>
					</Command>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
