import { describe, expect, it } from "vitest";
import { markdownToBasecampHtml } from "./markdownToBasecampHtml";

describe("markdownToBasecampHtml", () => {
	it("keeps real paragraphs and strikethrough (lexxy allowlist)", () => {
		const { html } = markdownToBasecampHtml("Hello ~~world~~ there");
		expect(html).toContain("<p>");
		expect(html).toContain("<del>world</del>");
	});

	it("keeps h1 through h6 as real headings", () => {
		const { html } = markdownToBasecampHtml("# Top\n\n## Sub\n\n### Deep");
		expect(html).toContain("<h1>Top</h1>");
		expect(html).toContain("<h2>Sub</h2>");
		expect(html).toContain("<h3>Deep</h3>");
	});

	it("extracts mermaid blocks as tokens and drops the source", () => {
		const md = "Intro\n\n```mermaid\nflowchart TD\n  A-->B\n```\n\nOutro";
		const { html, diagrams } = markdownToBasecampHtml(md);
		expect(diagrams).toHaveLength(1);
		expect(diagrams[0].code).toContain("flowchart TD");
		expect(html).toContain(diagrams[0].token);
		expect(html).not.toContain("flowchart TD");
	});

	it("keeps regular code blocks and carries the language for Prism", () => {
		const { html, diagrams } = markdownToBasecampHtml(
			"```js\nconst x = 1;\n```",
		);
		expect(diagrams).toHaveLength(0);
		expect(html).toContain('<pre data-language="js">');
		expect(html).toContain("const x = 1;");
	});

	it("renders ==highlight== as <mark>", () => {
		const { html } = markdownToBasecampHtml("a ==very== important point");
		expect(html).toContain("<mark>very</mark>");
	});

	it("reads the title front-matter property and strips front matter", () => {
		const md = "---\ntitle: My Note\n---\n\nBody text";
		const { title, html } = markdownToBasecampHtml(md);
		expect(title).toBe("My Note");
		expect(html).not.toContain("title:");
		expect(html).toContain("Body text");
	});

	it("converts images to links and strips disallowed attributes", () => {
		const { html } = markdownToBasecampHtml("![alt](https://x.com/a.png)");
		expect(html).toContain('<a href="https://x.com/a.png">alt</a>');
		expect(html).not.toContain("<img");
	});

	it("keeps gfm tables as real tables and lifts thead rows", () => {
		const md = "| a | b |\n| - | - |\n| 1 | 2 |";
		const { html } = markdownToBasecampHtml(md);
		expect(html).toContain("<table>");
		expect(html).toContain("<td>1</td>");
		expect(html).toContain("<th>a</th>");
		// thead is not in lexxy's allowlist; its header row is lifted into <table>.
		expect(html).not.toContain("<thead>");
	});
});
