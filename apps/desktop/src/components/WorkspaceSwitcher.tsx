import { useStoreValue } from "@simplestack/store/react";
import { Button, Input, Modal, WorkspaceSwitcherMenu } from "@sudomd/ui";
import { useState } from "react";
import MingcuteAddLine from "~icons/mingcute/add-line";
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

function folderName(path: string): string {
	return path.split("/").pop() ?? path.split("\\").pop() ?? path;
}

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
		workspaceNames[path]?.trim() || folderName(path);
	const others = recentWorkspaces.filter((p) => p !== workspacePath);

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
				title={workspacePath}
				open={open}
				onOpenChange={setWorkspaceSwitcherOpen}
			>
				<WorkspaceSwitcherMenu.Item
					selected
					title={workspacePath}
					onRename={() => beginRename(workspacePath)}
					renameLabel="Rename"
				>
					{displayName(workspacePath)}
				</WorkspaceSwitcherMenu.Item>
				{others.map((path) => (
					<WorkspaceSwitcherMenu.Item
						key={path}
						title={path}
						onClick={() => void openWorkspace(path)}
						onRename={() => beginRename(path)}
						renameLabel="Rename"
						onRemove={() => forgetWorkspace(path)}
						removeLabel="Remove from list"
					>
						{displayName(path)}
					</WorkspaceSwitcherMenu.Item>
				))}
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
						placeholder={renaming ? folderName(renaming.path) : undefined}
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
