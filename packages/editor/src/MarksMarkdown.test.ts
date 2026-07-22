import { describe, expect, it } from "vitest";
import { markdownToTiptapDoc } from "./markdownToProsemirror";
import { tiptapDocToMarkdown } from "./prosemirrorToMarkdown";

function roundTrip(md: string): string {
	return tiptapDocToMarkdown(markdownToTiptapDoc(md));
}

describe("highlight ==text==", () => {
	it("parses to a highlight mark", () => {
		const doc = markdownToTiptapDoc("a ==hi== b");
		const text = doc.content?.[0].content?.find((n) =>
			n.marks?.some((m) => m.type === "highlight"),
		);
		expect(text?.text).toBe("hi");
	});

	it("round-trips back to ==text==", () => {
		expect(roundTrip("a ==hi== b")).toBe("a ==hi== b");
	});

	it("composes with bold", () => {
		const out = roundTrip("**==both==**");
		expect(out).toContain("==");
		expect(out).toContain("**");
	});
});

describe("autolink bare URLs", () => {
	it("parses a bare URL into a link mark", () => {
		const doc = markdownToTiptapDoc("see https://example.com now");
		const link = doc.content?.[0].content?.find((n) =>
			n.marks?.some((m) => m.type === "link"),
		);
		expect(link?.marks?.[0].attrs?.href).toBe("https://example.com");
	});

	it("keeps the bare URL clickable (normalizes to an explicit link)", () => {
		expect(roundTrip("see https://example.com now")).toBe(
			"see [https://example.com](https://example.com) now",
		);
	});
});
