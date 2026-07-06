import { BlockDirectionExtension } from "@sudomd/editor";
import { EmojiShortcodeExtension } from "./EmojiShortcodeExtension";
import { sudomdTableExtensions } from "./TableExtension";

export const sudomdEditorExtensions = [
	BlockDirectionExtension,
	EmojiShortcodeExtension,
	...sudomdTableExtensions,
];
