import { Extension } from "@tiptap/core";

// Block nodes that hold text and should orient themselves. Code blocks are
// omitted on purpose — code reads left-to-right regardless of surrounding
// language.
const DIRECTIONAL_NODES = [
	"paragraph",
	"heading",
	"blockquote",
	"bulletList",
	"orderedList",
	"listItem",
	"taskList",
	"taskItem",
	"tableHeader",
	"tableCell",
];

/**
 * Give every block-level node `dir="auto"` so mixed Arabic/English documents
 * orient each block by its first strong directional character — matching how
 * Basecamp and most rich editors handle bidirectional text.
 *
 * Rendering-only: the attribute is always emitted as `auto`, never parsed into
 * a stored per-node value nor serialized to markdown.
 */
export const BlockDirectionExtension = Extension.create({
	name: "blockDirection",

	addGlobalAttributes() {
		return [
			{
				types: DIRECTIONAL_NODES,
				attributes: {
					dir: {
						default: "auto",
						parseHTML: () => "auto",
						renderHTML: () => ({ dir: "auto" }),
					},
				},
			},
		];
	},
});
