import { Extension } from "@tiptap/core";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const StoredMarksDecorationKey = new PluginKey("storedMarksDecoration");

/** Mark types that get a cursor decoration when stored on an empty selection. */
const DECORATED_MARKS = ["bold", "italic", "strike"] as const;

/**
 * Shows a zero-width widget decoration at the cursor when inline marks
 * (bold, italic, strikethrough) are stored on an empty selection.
 * This gives a visual cue that formatting is active before any text is typed.
 */
export const StoredMarksDecorationExtension = Extension.create({
	name: "storedMarksDecoration",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: StoredMarksDecorationKey,
				props: {
					decorations: (state: EditorState) => {
						const { selection, storedMarks } = state;
						if (!selection.empty) return null;

						// Check stored marks OR marks at the current cursor position
						const marks = storedMarks || selection.$from.marks();
						if (!marks || marks.length === 0) return null;

						const activeNames = marks
							.map((m) => m.type.name)
							.filter((n): n is (typeof DECORATED_MARKS)[number] =>
								(DECORATED_MARKS as readonly string[]).includes(n),
							);

						if (activeNames.length === 0) return null;

						const widget = document.createElement("span");
						widget.className = activeNames
							.map((n) => `pm-stored-mark-${n}`)
							.join(" ");
						widget.textContent = "\u200B"; // zero-width space

						const deco = Decoration.widget(selection.head, widget, {
							side: 0,
							// Marks typed after this widget should appear after it
							key: "storedMarksDecoration",
						});
						return DecorationSet.create(state.doc, [deco]);
					},
				},
			}),
		];
	},
});
