import { Extension, InputRule } from "@tiptap/core";

// Common `:shortcode:` → unicode. Inserted as plain text so it round-trips
// through markdown with no custom node.
const EMOJI: Record<string, string> = {
	smile: "😄",
	grin: "😁",
	joy: "😂",
	rofl: "🤣",
	wink: "😉",
	heart: "❤️",
	heart_eyes: "😍",
	thinking: "🤔",
	sob: "😭",
	cry: "😢",
	sweat_smile: "😅",
	sunglasses: "😎",
	tada: "🎉",
	fire: "🔥",
	rocket: "🚀",
	star: "⭐",
	sparkles: "✨",
	zap: "⚡",
	boom: "💥",
	bulb: "💡",
	warning: "⚠️",
	check: "✅",
	white_check_mark: "✅",
	x: "❌",
	cross: "❌",
	question: "❓",
	exclamation: "❗",
	"+1": "👍",
	thumbsup: "👍",
	"-1": "👎",
	thumbsdown: "👎",
	ok_hand: "👌",
	clap: "👏",
	wave: "👋",
	pray: "🙏",
	muscle: "💪",
	eyes: "👀",
	100: "💯",
	point_right: "👉",
	point_left: "👈",
	rainbow: "🌈",
	sun: "☀️",
	moon: "🌙",
	coffee: "☕",
	bug: "🐛",
	lock: "🔒",
	key: "🔑",
	pushpin: "📌",
	memo: "📝",
	calendar: "📅",
	hourglass: "⏳",
	clock: "🕐",
};

export const EmojiShortcodeExtension = Extension.create({
	name: "emojiShortcode",
	addInputRules() {
		return [
			new InputRule({
				find: /:([a-z0-9_+-]+):$/,
				handler: ({ range, match, chain }) => {
					const emoji = EMOJI[match[1]];
					if (!emoji) return null;
					chain().insertContentAt(range, emoji).run();
				},
			}),
		];
	},
});
