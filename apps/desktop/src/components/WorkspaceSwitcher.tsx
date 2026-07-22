import { useStoreValue } from "@simplestack/store/react";
import {
	Button,
	formatShortcut,
	Input,
	Modal,
	WorkspaceSwitcherMenu,
} from "@sudomd/ui";
import { useState } from "react";
import MingcuteAddLine from "~icons/mingcute/add-line";
import { basename, dirname, duplicateBasenames } from "../lib/filePath";
import { tildePath } from "../lib/tildePath";
import {
	forgetWorkspace,
	openWorkspace,
	setWorkspaceName,
	setWorkspaceSwitcherOpen,
} from "../store/actions";
import {
	recentWorkspacesStore,
	switcherOpenStore,
	workspaceNamesStore,
	workspacePathStore,
} from "../store/state";

export function WorkspaceSwitcher() {
	const workspacePath = useStoreValue(workspacePathStore);
	const recentWorkspaces = useStoreValue(recentWorkspacesStore);
	const workspaceNames = useStoreValue(workspaceNamesStore);
	const open = useStoreValue(switcherOpenStore);
	const [renaming, setRenaming] = useState<{
		path: string;
		value: string;
	} | null>(null);

	if (!workspacePath) return null;

	const displayName = (path: string) =>
		workspaceNames[path]?.trim() || basename(path);
	const others = recentWorkspaces.filter((p) => p !== workspacePath);
	const duplicateNames = duplicateBasenames([workspacePath, ...others]);

	const beginRename = (path: string) =>
		setRenaming({ path, value: displayName(path) });

	const commitRename = () => {
		if (!renaming) return;
		setWorkspaceName(renaming.path, renaming.value);
		setRenaming(null);
	};

	return (
		<>
			<WorkspaceSwitcherMenu
				label={displayName(workspacePath)}
				title={`${tildePath(workspacePath)} (${formatShortcut("CmdOrCtrl+Shift+O")})`}
				open={open}
				onOpenChange={setWorkspaceSwitcherOpen}
			>
				<WorkspaceSwitcherMenu.Item
					selected
					title={tildePath(workspacePath)}
					onRename={() => beginRename(workspacePath)}
					renameLabel="Rename"
				>
					<span className="truncate">{displayName(workspacePath)}</span>
				</WorkspaceSwitcherMenu.Item>
				{others.map((path) => {
					const parent = duplicateNames.has(basename(path))
						? dirname(path)
						: null;
					return (
						<WorkspaceSwitcherMenu.Item
							key={path}
							title={tildePath(path)}
							onClick={() => void openWorkspace(path)}
							onRename={() => beginRename(path)}
							renameLabel="Rename"
							onRemove={() => forgetWorkspace(path)}
							removeLabel="Remove from list"
						>
							<span className="min-w-0 shrink truncate">
								{displayName(path)}
							</span>
							{parent && (
								<span className="ms-auto min-w-0 flex-1 truncate text-start text-muted-foreground [direction:rtl]">
									<bdi dir="ltr">{tildePath(parent)}</bdi>
								</span>
							)}
						</WorkspaceSwitcherMenu.Item>
					);
				})}
				<WorkspaceSwitcherMenu.Item
					icon={<MingcuteAddLine className="size-3 shrink-0" />}
					onClick={() => void openWorkspace()}
				>
					Add folder...
				</WorkspaceSwitcherMenu.Item>
			</WorkspaceSwitcherMenu>

			<Modal
				open={renaming !== null}
				onOpenChange={(next) => !next && setRenaming(null)}
				title="Rename workspace"
				description="A display name for this folder. The folder on disk is unchanged."
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						commitRename();
					}}
					className="flex flex-col gap-3"
				>
					<Input
						autoFocus
						value={renaming?.value ?? ""}
						placeholder={renaming ? basename(renaming.path) : undefined}
						onChange={(event) =>
							setRenaming((current) =>
								current ? { ...current, value: event.target.value } : current,
							)
						}
					/>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setRenaming(null)}
						>
							Cancel
						</Button>
						<Button type="submit" size="sm">
							Save
						</Button>
					</div>
				</form>
			</Modal>
		</>
	);
}
