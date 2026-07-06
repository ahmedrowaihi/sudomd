import { describe, expect, it } from "vitest";
import { markdownToTiptapDoc } from "./markdownToProsemirror";
import { tiptapDocToMarkdown } from "./prosemirrorToMarkdown";

function firstTable(doc: ReturnType<typeof markdownToTiptapDoc>) {
	return doc.content?.find((node) => node.type === "table");
}

describe("markdown tables <-> prosemirror", () => {
	it("parses a gfm table into table/tableRow/header+cell nodes", () => {
		const md = "| Name | Age |\n| --- | --- |\n| Ada | 36 |";
		const table = firstTable(markdownToTiptapDoc(md));
		expect(table).toBeDefined();
		const rows = table?.content ?? [];
		expect(rows).toHaveLength(2);
		expect(rows[0].content?.[0].type).toBe("tableHeader");
		expect(rows[1].content?.[0].type).toBe("tableCell");
		const firstCellText = rows[0].content?.[0].content?.[0].content?.[0].text;
		expect(firstCellText).toBe("Name");
	});

	it("round-trips a table back to gfm markdown", () => {
		const md = "| Name | Age |\n| --- | --- |\n| Ada | 36 |";
		const out = tiptapDocToMarkdown(markdownToTiptapDoc(md));
		expect(out).toContain("| Name | Age |");
		expect(out).toContain("| --- | --- |");
		expect(out).toContain("| Ada | 36 |");
	});

	it("preserves column alignment through the round-trip", () => {
		const md = "| L | C | R |\n| :--- | :---: | ---: |\n| a | b | c |";
		const out = tiptapDocToMarkdown(markdownToTiptapDoc(md));
		expect(out).toContain("| :--- | :---: | ---: |");
	});

	it("keeps inline formatting inside cells", () => {
		const md = "| Col |\n| --- |\n| **bold** [x](https://y.com) |";
		const out = tiptapDocToMarkdown(markdownToTiptapDoc(md));
		expect(out).toContain("**bold**");
		expect(out).toContain("[x](https://y.com)");
	});

	it("escapes pipes in cell content", () => {
		const md = "| Col |\n| --- |\n| a \\| b |";
		const out = tiptapDocToMarkdown(markdownToTiptapDoc(md));
		expect(out).toContain("a \\| b");
	});
});
