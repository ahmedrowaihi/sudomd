import type { Element, Root as HastRoot } from "hast";
import type { Code, Root as MdastRoot } from "mdast";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { type FileProperty, parseMarkdownFrontMatter } from "./frontMatter";
import { remarkHighlight } from "./remarkHighlight";

/** A mermaid block lifted out of the document; `token` marks where its rendered image belongs in `html`. */
export type BasecampDiagram = { token: string; code: string };

export type BasecampDocument = {
	/** From a `title` front-matter property, else `null` (caller falls back to filename). */
	title: string | null;
	/** Semantic HTML restricted to Basecamp's rich-text allowlist, with `token`s where diagrams go. */
	html: string;
	diagrams: BasecampDiagram[];
};

// Tags Basecamp's lexxy editor keeps on paste (basecamp/lexxy engine.rb):
// the standard Action Text set plus table tags.
const BASECAMP_SCHEMA = {
	tagNames: [
		"p",
		"div",
		"span",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"br",
		"hr",
		"strong",
		"em",
		"b",
		"i",
		"mark",
		"del",
		"ins",
		"sub",
		"sup",
		"code",
		"pre",
		"a",
		"blockquote",
		"ol",
		"ul",
		"li",
		"table",
		"tbody",
		"tr",
		"th",
		"td",
	],
	attributes: {
		a: ["href"],
		th: ["align"],
		td: ["align"],
		pre: ["dataLanguage"],
	},
	protocols: { href: ["http", "https", "mailto"] },
	strip: ["script", "style"],
};

/**
 * Convert a markdown note into Basecamp-ready rich-text HTML.
 *
 * Front matter is stripped from the body; a `title` property (if present) is
 * returned separately. Fenced ```mermaid blocks are replaced with placeholder
 * `token`s and returned in `diagrams` so the caller can swap each token for a
 * rendered image or a placeholder — Basecamp cannot render mermaid itself.
 */
export function markdownToBasecampHtml(markdown: string): BasecampDocument {
	const parsed = parseMarkdownFrontMatter(markdown);
	const body = parsed.body;
	const title =
		parsed.type === "valid" ? titleFromProperties(parsed.properties) : null;

	const diagrams: BasecampDiagram[] = [];

	const file = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkHighlight)
		.use(() => (tree: MdastRoot) => extractMermaid(tree, diagrams))
		.use(remarkRehype)
		.use(() => (tree: HastRoot) => normalizeForBasecamp(tree))
		.use(rehypeSanitize, BASECAMP_SCHEMA)
		.use(rehypeStringify)
		.processSync(body);

	return { title, html: String(file), diagrams };
}

function languageFromClassName(className: unknown): string | null {
	if (!Array.isArray(className)) return null;
	for (const cls of className) {
		if (typeof cls === "string" && cls.startsWith("language-")) {
			return cls.slice("language-".length) || null;
		}
	}
	return null;
}

function titleFromProperties(properties: FileProperty[]): string | null {
	for (const property of properties) {
		if (
			property.key.toLowerCase() === "title" &&
			property.type === "text" &&
			property.value.trim()
		) {
			return property.value.trim();
		}
	}
	return null;
}

function extractMermaid(tree: MdastRoot, diagrams: BasecampDiagram[]) {
	let index = 0;
	visit(tree, "code", (node: Code, i, parent) => {
		if (node.lang !== "mermaid" || !parent || i == null) return;
		const token = `[[SUDOMD_MERMAID_${index}]]`;
		diagrams.push({ token, code: node.value });
		index += 1;
		parent.children[i] = {
			type: "paragraph",
			children: [{ type: "text", value: token }],
		};
		return SKIP;
	});
}

function normalizeForBasecamp(tree: HastRoot) {
	visit(tree, "element", (node: Element, i, parent) => {
		// lexxy's allowlist omits <thead>; lift its rows into the <table>.
		if (node.tagName === "thead" && parent && i != null) {
			parent.children.splice(i, 1, ...node.children);
			return [SKIP, i];
		}
		// Carry the code language onto <pre> so lexxy's Prism highlights it.
		if (node.tagName === "pre") {
			const code = node.children.find(
				(child): child is Element =>
					child.type === "element" && child.tagName === "code",
			);
			const language = languageFromClassName(code?.properties?.className);
			if (language)
				node.properties = { ...node.properties, dataLanguage: language };
			return;
		}
		// Basecamp can't resolve local image paths; degrade images to links.
		if (node.tagName === "img" && parent && i != null) {
			const src = node.properties?.src;
			if (typeof src !== "string") return;
			const alt = node.properties?.alt;
			const label = typeof alt === "string" && alt ? alt : src;
			parent.children[i] = {
				type: "element",
				tagName: "a",
				properties: { href: src },
				children: [{ type: "text", value: label }],
			};
			return SKIP;
		}
	});
}
