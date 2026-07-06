type MermaidApi = typeof import("mermaid")["default"];

let mermaidPromise: Promise<MermaidApi> | null = null;
let renderSeq = 0;

export function loadMermaid(): Promise<MermaidApi> {
	if (!mermaidPromise) {
		mermaidPromise = import("mermaid").then((mod) => mod.default);
	}
	return mermaidPromise;
}

/** `htmlLabels: false` keeps labels as `<text>` so the SVG rasterizes cleanly. */
export async function renderMermaidSvg(
	code: string,
	options: { dark?: boolean; htmlLabels?: boolean } = {},
): Promise<string> {
	const mermaid = await loadMermaid();
	mermaid.initialize({
		startOnLoad: false,
		securityLevel: "strict",
		theme: options.dark ? "dark" : "default",
		htmlLabels: options.htmlLabels ?? true,
		flowchart: { htmlLabels: options.htmlLabels ?? true },
	});
	renderSeq += 1;
	const { svg } = await mermaid.render(`sudomd-mermaid-${renderSeq}`, code);
	return svg;
}

/** Rasterize a mermaid diagram to a PNG blob at `scale`×. Renderer-only. */
export async function renderMermaidToPng(
	code: string,
	options: { scale?: number } = {},
): Promise<Blob> {
	const scale = options.scale ?? 2;
	const svg = await renderMermaidSvg(code, { htmlLabels: false });
	const { width, height } = svgIntrinsicSize(svg);

	const image = await loadImage(
		`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
	);

	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width * scale));
	canvas.height = Math.max(1, Math.round(height * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D context unavailable");
	// Mermaid SVGs are transparent; flatten onto white so text stays legible.
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/png"),
	);
	if (!blob) throw new Error("Failed to encode diagram PNG");
	return blob;
}

function svgIntrinsicSize(svg: string): { width: number; height: number } {
	const viewBox = svg.match(/viewBox="([\d.\-\s]+)"/);
	if (viewBox) {
		const parts = viewBox[1].split(/\s+/).map(Number);
		if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
			return { width: parts[2], height: parts[3] };
		}
	}
	const width = Number(svg.match(/\bwidth="([\d.]+)/)?.[1]);
	const height = Number(svg.match(/\bheight="([\d.]+)/)?.[1]);
	return {
		width: Number.isFinite(width) && width > 0 ? width : 800,
		height: Number.isFinite(height) && height > 0 ? height : 600,
	};
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Failed to load diagram SVG"));
		image.src = src;
	});
}
