import type { Element, Root as HastRoot, Text } from "hast";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const MENTION_TYPE = "application/vnd.basecamp.mention";

/**
 * Convert Basecamp rich text (Trix/lexxy HTML) into markdown for insertion into
 * a note. The inverse of {@link markdownToBasecampHtml}.
 */
export function basecampHtmlToMarkdown(html: string): string {
	const file = unified()
		.use(rehypeParse, { fragment: true })
		.use(() => (tree: HastRoot) => flattenAttachments(tree))
		.use(rehypeRemark)
		.use(remarkGfm)
		.use(remarkStringify, { bullet: "-", fences: true })
		.processSync(inlineMentions(html));
	return String(file).trim();
}

// Replace @mention attachments on the raw HTML, before parsing: the HTML5
// parser hoists a mention's inner `<figure>` out of its enclosing `<p>` (a `<p>`
// can't contain a `<figure>`), orphaning the avatar from its `<bc-attachment>`
// wrapper and leaving a bare giant avatar image. Names come from the avatar
// `title` ("Name, role at company") or `alt`.
const MENTION_ATTACHMENT =
	/<bc-attachment\b[^>]*content-type="application\/vnd\.basecamp\.mention"[^>]*>[\s\S]*?<\/bc-attachment>/g;
function inlineMentions(html: string): string {
	return html.replace(MENTION_ATTACHMENT, (block) => {
		const title = block.match(/title="([^",]+)/)?.[1];
		const alt = block.match(/alt="([^"]+)"/)?.[1];
		const name = (title ?? alt ?? "").trim();
		return name ? ` @${name} ` : "";
	});
}

function attr(node: Element, name: string): string {
	const value = node.properties?.[name];
	return typeof value === "string" ? value : "";
}

function text(value: string): Text {
	return { type: "text", value };
}

// `<bc-attachment>` wraps three very different things — @mentions, inline
// images, and file attachments — behind identical markup. Rendering their raw
// children produces giant avatar images for mentions and dangling captions for
// images, so map each kind to its markdown equivalent instead. Rebuilds each
// children array in place rather than splicing during traversal (adjacent
// attachments make index-based mutation drop siblings).
function flattenAttachments(tree: HastRoot) {
	const walk = (node: HastRoot | Element) => {
		const rebuilt: Array<Element | Text> = [];
		for (const child of node.children as Array<Element | Text>) {
			if (child.type === "element" && child.tagName === "bc-attachment") {
				rebuilt.push(...convertAttachment(child));
			} else {
				if (child.type === "element") walk(child);
				rebuilt.push(child);
			}
		}
		node.children = rebuilt as HastRoot["children"];
	};
	walk(tree);
}

function convertAttachment(node: Element): Array<Element | Text> {
	const contentType = attr(node, "content-type");
	const caption = attr(node, "caption");

	if (contentType === MENTION_TYPE) {
		const name = mentionName(node);
		return name ? [text(`@${name} `)] : [];
	}
	if (contentType.startsWith("image/")) {
		const src = attr(node, "href") || attr(node, "url");
		if (src) {
			const alt = caption || attr(node, "filename") || "image";
			return [
				{
					type: "element",
					tagName: "img",
					properties: { src, alt },
					children: [],
				},
			];
		}
		return caption ? [text(caption)] : [];
	}
	const href = attr(node, "href") || attr(node, "url");
	const label = caption || attr(node, "filename");
	if (href && label) {
		return [
			{
				type: "element",
				tagName: "a",
				properties: { href },
				children: [text(label)],
			},
		];
	}
	if (label) return [text(label)];
	return node.children.filter(
		(child): child is Element => child.type === "element",
	);
}

// A mention's display name lives on the inner avatar `<img alt>` (full name) or
// its `title` ("Name, role at company"); fall back to the mention's own text.
function mentionName(node: Element): string {
	let name = "";
	visit(node, "element", (el: Element) => {
		if (el.tagName !== "img") return;
		const alt = typeof el.properties?.alt === "string" ? el.properties.alt : "";
		if (alt.trim()) {
			name = alt.trim();
			return false;
		}
		const title =
			typeof el.properties?.title === "string" ? el.properties.title : "";
		if (title.trim()) {
			name = title.split(",")[0].trim();
			return false;
		}
	});
	return name;
}
