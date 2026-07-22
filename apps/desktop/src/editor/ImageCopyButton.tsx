import { Button } from "@sudomd/ui";
import { useState } from "react";
import { toast } from "sonner";
import MingcuteCopy2Line from "~icons/mingcute/copy-2-line";
import "./imageCopy.css";

export function ImageCopyButton({ src }: { src: string }) {
	const [copied, setCopied] = useState(false);

	async function copyImage() {
		try {
			await copyImageToClipboard(src);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
			toast.error("Failed to copy image");
		}
	}

	return (
		<div className="pm-image-controls" contentEditable={false}>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				aria-label="Copy image"
				title={copied ? "Copied!" : "Copy image"}
				onClick={() => void copyImage()}
			>
				<MingcuteCopy2Line className="size-3.5" />
			</Button>
		</div>
	);
}

async function copyImageToClipboard(src: string): Promise<void> {
	const response = await fetch(src);
	const blob = await response.blob();
	// The async clipboard API only accepts PNG for images.
	const png = blob.type === "image/png" ? blob : await toPngBlob(blob);
	await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

async function toPngBlob(blob: Blob): Promise<Blob> {
	const bitmap = await createImageBitmap(blob);
	const canvas = document.createElement("canvas");
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
	bitmap.close();
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(out) => (out ? resolve(out) : reject(new Error("PNG encode failed"))),
			"image/png",
		);
	});
}
