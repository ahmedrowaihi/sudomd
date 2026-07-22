import { describe, expect, it } from "vitest";
import { basecampHtmlToMarkdown } from "./basecampHtmlToMarkdown";

describe("basecampHtmlToMarkdown", () => {
	it("converts headings, paragraphs, and emphasis", () => {
		const md = basecampHtmlToMarkdown(
			"<h1>Title</h1><div>Hello <strong>bold</strong> and <em>italic</em>.</div>",
		);
		expect(md).toContain("# Title");
		expect(md).toContain("**bold**");
		expect(md).toContain("*italic*");
	});

	it("converts lists and blockquotes", () => {
		const md = basecampHtmlToMarkdown(
			"<ul><li>one</li><li>two</li></ul><blockquote>quote</blockquote>",
		);
		expect(md).toContain("- one");
		expect(md).toContain("- two");
		expect(md).toContain("> quote");
	});

	it("keeps links", () => {
		const md = basecampHtmlToMarkdown(
			'<div><a href="https://x.com">x</a></div>',
		);
		expect(md).toContain("[x](https://x.com)");
	});

	it("drops bc-attachment wrappers but keeps a caption", () => {
		const md = basecampHtmlToMarkdown(
			'<bc-attachment sgid="abc" caption="a photo"></bc-attachment>',
		);
		expect(md).toContain("a photo");
		expect(md).not.toContain("bc-attachment");
	});

	it("renders image attachments as markdown images", () => {
		const md = basecampHtmlToMarkdown(
			'<bc-attachment content-type="image/png" href="https://storage/img.png" filename="diagram.png"><figure><img src="https://preview/full"><figcaption>diagram.png</figcaption></figure></bc-attachment>',
		);
		expect(md).toContain("![diagram.png](https://storage/img.png)");
		expect(md).not.toContain("bc-attachment");
	});

	it("converts @mentions to inline @name text, not avatar images", () => {
		// The HTML5 parser hoists the mention's <figure> out of the <p>; the raw
		// name must be inlined before parsing. Regression for the giant-avatar bug.
		const md = basecampHtmlToMarkdown(
			'<p><br><bc-attachment content-type="application/vnd.basecamp.mention" content="x"><figure><img alt="عمار الطحان" title="عمار الطحان, تقنية at ثمانية">عمار</figure></bc-attachment></p>',
		);
		expect(md).toContain("@عمار الطحان");
		expect(md).not.toContain("![");
		expect(md).not.toContain("avatar");
	});
});
