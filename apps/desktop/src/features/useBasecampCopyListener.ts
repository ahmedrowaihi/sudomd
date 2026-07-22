import { COPY_FOR_BASECAMP_EVENT } from "@sudomd/ui";
import { useEffect } from "react";
import { toast } from "sonner";
import { copyDocumentForBasecamp } from "../lib/basecampClipboard";

export function useBasecampCopyListener() {
	useEffect(() => {
		const handleCopy = (event: Event) => {
			const markdown = (event as CustomEvent<{ markdown?: string }>).detail
				?.markdown;
			if (!markdown) return;
			void copyDocumentForBasecamp(markdown)
				.then(({ diagramCount }) =>
					toast.success("Selection copied for Basecamp", {
						description:
							diagramCount > 0
								? "Paste into Basecamp, then copy each diagram image from its preview."
								: "Paste into a Basecamp document, message, or comment.",
					}),
				)
				.catch(() => toast.error("Failed to copy for Basecamp"));
		};
		window.addEventListener(COPY_FOR_BASECAMP_EVENT, handleCopy);
		return () =>
			window.removeEventListener(COPY_FOR_BASECAMP_EVENT, handleCopy);
	}, []);
}
