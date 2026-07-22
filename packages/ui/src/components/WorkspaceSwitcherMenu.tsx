import { Menu } from "@base-ui/react/menu";
import type { ReactNode } from "react";
import MingcuteCheckLine from "~icons/mingcute/check-line";
import MingcuteCloseLine from "~icons/mingcute/close-line";
import MingcuteEditLine from "~icons/mingcute/edit-line";
import MingcuteSelectorVerticalLine from "~icons/mingcute/selector-vertical-line";
import { cn } from "../lib/utils";

function Item({
	children,
	icon,
	selected,
	className,
	onRename,
	renameLabel,
	onRemove,
	removeLabel,
	...props
}: Menu.Item.Props & {
	icon?: ReactNode;
	selected?: boolean;
	onRename?: () => void;
	renameLabel?: string;
	onRemove?: () => void;
	removeLabel?: string;
}) {
	return (
		<Menu.Item
			{...props}
			className={cn(
				"group flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-start text-[11px] text-sidebar-foreground outline-hidden select-none data-highlighted:bg-accent",
				className,
			)}
		>
			{selected ? (
				<MingcuteCheckLine className="size-3 shrink-0 text-brand" />
			) : icon ? (
				icon
			) : (
				<span className="size-3 shrink-0" />
			)}
			<span className="min-w-0 flex-1 truncate">{children}</span>
			{onRename && (
				<button
					type="button"
					aria-label={renameLabel ?? "Rename"}
					title={renameLabel ?? "Rename"}
					className="ms-auto grid size-4 shrink-0 place-content-center rounded-sm text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-data-highlighted:opacity-100"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						onRename();
					}}
				>
					<MingcuteEditLine className="size-3" />
				</button>
			)}
			{onRemove && (
				<button
					type="button"
					aria-label={removeLabel ?? "Remove"}
					title={removeLabel ?? "Remove"}
					className={cn(
						"grid size-4 shrink-0 place-content-center rounded-sm text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-data-highlighted:opacity-100",
						!onRename && "ms-auto",
					)}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						onRemove();
					}}
				>
					<MingcuteCloseLine className="size-3" />
				</button>
			)}
		</Menu.Item>
	);
}

function Separator() {
	return <Menu.Separator className="my-1 h-px bg-border" />;
}

export function WorkspaceSwitcherMenu({
	label,
	title,
	open,
	onOpenChange,
	children,
}: {
	label: string;
	title?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: ReactNode;
}) {
	return (
		<Menu.Root open={open} onOpenChange={onOpenChange}>
			<Menu.Trigger
				className="inline-flex max-w-full min-w-0 cursor-pointer items-center gap-0.5 rounded-sm py-1 ps-2 pe-1 hover:bg-muted"
				title={title}
			>
				<span className="truncate text-xs font-semibold text-sidebar-foreground">
					{label}
				</span>
				<MingcuteSelectorVerticalLine className="size-4 shrink-0 text-muted-foreground" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner
					align="start"
					side="bottom"
					sideOffset={4}
					className="isolate z-50"
				>
					<Menu.Popup className="z-50 w-56 origin-(--transform-origin) rounded-[var(--radius-popover)] border border-border bg-popover p-1 text-[11px] text-popover-foreground shadow-overlay outline-hidden transition-[transform,opacity] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
						{children}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

WorkspaceSwitcherMenu.Item = Item;
WorkspaceSwitcherMenu.Separator = Separator;
