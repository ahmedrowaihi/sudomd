import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import MingcuteListExpansionLine from "~icons/mingcute/list-expansion-line";
import { Button } from "../primitives/button";

type Heading = { level: number; text: string; pos: number };

function readHeadings(editor: Editor): Heading[] {
	const headings: Heading[] = [];
	editor.state.doc.descendants((node, pos) => {
		if (node.type.name === "heading") {
			const text = node.textContent.trim();
			headings.push({
				level: node.attrs.level ?? 1,
				text: text || "Untitled",
				pos,
			});
		}
	});
	return headings;
}

export function OutlinePanel({ editor }: { editor: Editor | null }) {
	const [headings, setHeadings] = useState<Heading[]>([]);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!editor) return;
		const update = () => setHeadings(readHeadings(editor));
		update();
		editor.on("update", update);
		return () => {
			editor.off("update", update);
		};
	}, [editor]);

	if (!editor || headings.length === 0) return null;

	const minLevel = Math.min(...headings.map((h) => h.level));

	function jumpTo(pos: number) {
		editor
			?.chain()
			.focus()
			.setTextSelection(pos + 1)
			.scrollIntoView()
			.run();
	}

	return (
		<div className="pointer-events-none absolute top-3 end-3 z-10 flex flex-col items-end gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				aria-label={open ? "Hide outline" : "Show outline"}
				title="Outline"
				className="pointer-events-auto bg-background/80 backdrop-blur-[2px]"
				data-open={open}
				onClick={() => setOpen((value) => !value)}
			>
				<MingcuteListExpansionLine className="size-3.5" />
			</Button>
			{open && (
				<nav className="pointer-events-auto max-h-[60vh] w-56 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay">
					{headings.map((heading) => (
						<button
							key={`${heading.pos}-${heading.text}`}
							type="button"
							className="block w-full truncate rounded-sm px-2 py-1 text-start text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
							style={{
								paddingInlineStart: `${0.5 + (heading.level - minLevel) * 0.75}rem`,
							}}
							title={heading.text}
							onClick={() => jumpTo(heading.pos)}
						>
							{heading.text}
						</button>
					))}
				</nav>
			)}
		</div>
	);
}
