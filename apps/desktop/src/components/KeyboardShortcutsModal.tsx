import { Modal } from "@sudomd/ui";
import { desktopApi } from "../desktopApi";

type Shortcut = { label: string; keys: string[] };
type Group = { title: string; shortcuts: Shortcut[] };

const GROUPS: Group[] = [
	{
		title: "Formatting",
		shortcuts: [
			{ label: "Bold", keys: ["Mod", "B"] },
			{ label: "Italic", keys: ["Mod", "I"] },
			{ label: "Inline code", keys: ["Mod", "E"] },
			{ label: "Strikethrough", keys: ["Mod", "Shift", "X"] },
			{ label: "Highlight", keys: ["Mod", "Shift", "H"] },
			{ label: "Link", keys: ["Mod", "K"] },
		],
	},
	{
		title: "Lists",
		shortcuts: [
			{ label: "Bulleted list", keys: ["Mod", "Shift", "8"] },
			{ label: "Numbered list", keys: ["Mod", "Shift", "7"] },
			{ label: "To-do list", keys: ["Mod", "Shift", "9"] },
		],
	},
	{
		title: "Editing",
		shortcuts: [
			{ label: "Undo", keys: ["Mod", "Z"] },
			{ label: "Redo", keys: ["Mod", "Shift", "Z"] },
			{ label: "Find in note", keys: ["Mod", "F"] },
			{ label: "Command menu", keys: ["/"] },
			{ label: "Wiki link", keys: ["[["] },
		],
	},
	{
		title: "Files & workspace",
		shortcuts: [
			{ label: "Go to note", keys: ["Mod", "P"] },
			{ label: "Claude assistant", keys: ["Mod", "L"] },
			{ label: "New file", keys: ["Mod", "N"] },
			{ label: "Add folder", keys: ["Mod", "Shift", "N"] },
			{ label: "Open file", keys: ["Mod", "O"] },
			{ label: "Switch folder", keys: ["Mod", "Shift", "O"] },
			{ label: "Copy file path", keys: ["Mod", "Shift", "C"] },
			{ label: "Reveal in file manager", keys: ["Mod", "Alt", "R"] },
			{ label: "Settings", keys: ["Mod", ","] },
		],
	},
	{
		title: "View",
		shortcuts: [
			{ label: "Toggle sidebar", keys: ["Mod", "Shift", "E"] },
			{ label: "Zoom in", keys: ["Mod", "="] },
			{ label: "Zoom out", keys: ["Mod", "-"] },
			{ label: "Reset zoom", keys: ["Mod", "0"] },
			{ label: "Keyboard shortcuts", keys: ["Mod", "/"] },
		],
	},
];

export function KeyboardShortcutsModal({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const mac = desktopApi.platform === "darwin";
	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Keyboard Shortcuts"
			className="max-w-2xl"
		>
			<div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
				{GROUPS.map((group) => (
					<section key={group.title}>
						<h3 className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
							{group.title}
						</h3>
						<ul className="flex flex-col gap-1.5">
							{group.shortcuts.map((shortcut) => (
								<li
									key={shortcut.label}
									className="flex items-center justify-between gap-4 text-xs"
								>
									<span className="text-foreground">{shortcut.label}</span>
									<span className="flex shrink-0 items-center gap-1">
										{shortcut.keys.map((key) => (
											<kbd
												key={key}
												className="inline-flex min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] text-foreground"
											>
												{formatKey(key, mac)}
											</kbd>
										))}
									</span>
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</Modal>
	);
}

function formatKey(key: string, mac: boolean): string {
	switch (key) {
		case "Mod":
			return mac ? "⌘" : "Ctrl";
		case "Shift":
			return mac ? "⇧" : "Shift";
		case "Alt":
			return mac ? "⌥" : "Alt";
		case "Ctrl":
			return mac ? "⌃" : "Ctrl";
		default:
			return key;
	}
}
