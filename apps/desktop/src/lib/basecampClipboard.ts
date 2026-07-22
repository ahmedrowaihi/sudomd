import { markdownToBasecampHtml } from "@sudomd/editor";

export type CopyForBasecampResult = {
	/** Number of mermaid diagrams left as placeholders for manual image paste. */
	diagramCount: number;
};

/**
 * Copy the current note to the clipboard as Basecamp-ready rich text.
 *
 * Basecamp can't render mermaid, so each diagram becomes a labeled placeholder
 * ("Diagram N — paste image here"); the user copies each rendered image from
 * Sudomd's preview and pastes it over the placeholder in Basecamp.
 */
export async function copyDocumentForBasecamp(
	markdown: string,
): Promise<CopyForBasecampResult> {
	const { html, diagrams } = markdownToBasecampHtml(markdown);

	let finalHtml = html;
	diagrams.forEach((diagram, index) => {
		const placeholder = `<div><strong>【 Diagram ${index + 1} — paste image here 】</strong></div>`;
		finalHtml = finalHtml.split(diagram.token).join(placeholder);
	});

	await navigator.clipboard.write([
		new ClipboardItem({
			"text/html": new Blob([finalHtml], { type: "text/html" }),
			"text/plain": new Blob([htmlToPlainText(finalHtml)], {
				type: "text/plain",
			}),
		}),
	]);

	return { diagramCount: diagrams.length };
}

function htmlToPlainText(html: string): string {
	return html
		.replace(/<\/td>\s*<td[^>]*>/gi, " | ")
		.replace(/<\/th>\s*<th[^>]*>/gi, " | ")
		.replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, "\n")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
