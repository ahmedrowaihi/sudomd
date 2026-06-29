import { describe, expect, it } from "vitest";
import { markdownToTiptapDoc } from "./markdownToProsemirror";
import { tiptapDocToMarkdown } from "./prosemirrorToMarkdown";

describe("strong markdown conversion", () => {
	it("serializes bold text with trailing whitespace outside the closing delimiter", () => {
		const markdown = tiptapDocToMarkdown({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "bold ",
							marks: [{ type: "bold" }],
						},
						{
							type: "text",
							text: "next",
						},
					],
				},
			],
		});

		expect(markdown).toBe("**bold** next");
	});

	it("rehydrates legacy malformed bold markdown with the corrected mark range", () => {
		expect(markdownToTiptapDoc("**bold **next")).toEqual(
			markdownToTiptapDoc("**bold** next"),
		);
	});

	it("rehydrates list items containing legacy malformed bold markdown", () => {
		expect(markdownToTiptapDoc("- **example- **with bold at the end")).toEqual(
			markdownToTiptapDoc("- **example-** with bold at the end"),
		);
	});
});
