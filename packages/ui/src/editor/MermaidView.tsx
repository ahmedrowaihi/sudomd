import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState } from "react";
import MingcuteCloseLine from "~icons/mingcute/close-line";
import MingcuteCopy2Line from "~icons/mingcute/copy-2-line";
import MingcuteFullscreenLine from "~icons/mingcute/fullscreen-line";
import { Button } from "../primitives/button";
import { renderMermaidSvg, renderMermaidToPng } from "./mermaidRender";

/**
 * Live-rendered preview for ```mermaid code blocks. The source stays editable
 * in the ProseMirror node view; this renders the diagram beside it (marked
 * non-editable so the document model ignores it) and offers a full-screen view.
 */
export function MermaidView({ code }: { code: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [svg, setSvg] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [fullscreen, setFullscreen] = useState(false);
	const [copied, setCopied] = useState(false);

	async function copyImage() {
		try {
			const blob = await renderMermaidToPng(code);
			await navigator.clipboard.write([
				new ClipboardItem({ "image/png": blob }),
			]);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	}

	useEffect(() => {
		const source = code.trim();
		if (!source) {
			setSvg("");
			setError(null);
			return;
		}

		let cancelled = false;
		// Debounce: diagrams are expensive and the source changes per keystroke.
		const handle = window.setTimeout(() => {
			void (async () => {
				try {
					const isDark = Boolean(containerRef.current?.closest(".dark"));
					const rendered = await renderMermaidSvg(source, { dark: isDark });
					if (cancelled) return;
					setSvg(rendered);
					setError(null);
				} catch (err) {
					if (cancelled) return;
					setSvg("");
					setError(
						err instanceof Error ? err.message : "Failed to render diagram",
					);
				}
			})();
		}, 250);

		return () => {
			cancelled = true;
			window.clearTimeout(handle);
		};
	}, [code]);

	return (
		<div
			ref={containerRef}
			className="pm-mermaid-preview"
			contentEditable={false}
		>
			{error ? (
				<pre className="pm-mermaid-error">{error}</pre>
			) : svg ? (
				<>
					<div className="pm-mermaid-controls">
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label="Copy diagram as image"
							title={copied ? "Copied!" : "Copy image"}
							onClick={() => void copyImage()}
						>
							<MingcuteCopy2Line className="size-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label="Open diagram full screen"
							title="Full screen"
							onClick={() => setFullscreen(true)}
						>
							<MingcuteFullscreenLine className="size-3.5" />
						</Button>
					</div>
					<div
						className="pm-mermaid-svg"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid renders trusted SVG with securityLevel "strict".
						dangerouslySetInnerHTML={{ __html: svg }}
					/>
					<MermaidFullscreen
						open={fullscreen}
						onOpenChange={setFullscreen}
						svg={svg}
					/>
				</>
			) : (
				<span className="pm-mermaid-empty">Mermaid diagram</span>
			)}
		</div>
	);
}

function MermaidFullscreen({
	open,
	onOpenChange,
	svg,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	svg: string;
}) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ease-snappy data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
				<Dialog.Popup className="fixed inset-4 z-50 flex flex-col rounded-md border border-border bg-card text-card-foreground shadow-overlay outline-hidden transition-[scale,opacity] duration-200 ease-snappy data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
					<div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
						<Dialog.Title className="m-0 text-xs font-medium text-muted-foreground">
							Mermaid diagram
						</Dialog.Title>
						<Dialog.Close
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Close"
									type="button"
								>
									<MingcuteCloseLine />
								</Button>
							}
						/>
					</div>
					<div
						className="pm-mermaid-fullscreen-svg flex min-h-0 flex-1 items-center justify-center overflow-auto p-6"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid renders trusted SVG with securityLevel "strict".
						dangerouslySetInnerHTML={{ __html: svg }}
					/>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
