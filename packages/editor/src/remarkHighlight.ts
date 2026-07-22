import type { Root, Text } from "mdast";
import type { Node } from "unist";
import { SKIP, visit } from "unist-util-visit";

const PATTERN = /==([^\n=]+)==/g;

/**
 * Parse `==text==` into `highlight` mdast nodes. Shared by the editor's
 * markdown→ProseMirror parser and the Basecamp exporter; `data.hName` makes
 * remark-rehype render it as `<mark>`.
 */
export function remarkHighlight() {
	return (tree: Root) => {
		visit(tree, "text", (node: Text, index, parent) => {
			if (!parent || index == null || !node.value.includes("==")) return;

			const replacement: Node[] = [];
			let last = 0;
			PATTERN.lastIndex = 0;
			for (
				let match = PATTERN.exec(node.value);
				match !== null;
				match = PATTERN.exec(node.value)
			) {
				if (match.index > last) {
					replacement.push(text(node.value.slice(last, match.index)));
				}
				replacement.push({
					type: "highlight",
					data: { hName: "mark" },
					children: [text(match[1])],
				} as Node);
				last = match.index + match[0].length;
			}
			if (replacement.length === 0) return;
			if (last < node.value.length) {
				replacement.push(text(node.value.slice(last)));
			}

			parent.children.splice(index, 1, ...(replacement as Text[]));
			return [SKIP, index + replacement.length];
		});
	};
}

function text(value: string): Text {
	return { type: "text", value };
}
