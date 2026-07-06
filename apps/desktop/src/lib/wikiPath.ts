import { stripMarkdownExtension, withMarkdownExtension } from "@sudomd/editor";
import type { FileEntry } from "../store/state";
import { dirname, joinPath, relativeWorkspacePath } from "./filePath";

// Join `rel` onto `baseDir` and collapse `.`/`..` segments.
function resolveRelative(baseDir: string, rel: string): string {
	const isAbsolute = baseDir.startsWith("/");
	const parts = `${baseDir}/${rel}`
		.split("/")
		.filter((part) => part !== "" && part !== ".");
	const stack: string[] = [];
	for (const part of parts) {
		if (part === "..") stack.pop();
		else stack.push(part);
	}
	return (isAbsolute ? "/" : "") + stack.join("/");
}

export function resolveWikiPath({
	target,
	files,
	workspacePath,
	currentPath,
}: {
	target: string;
	files: FileEntry[];
	workspacePath: string | null;
	/** The open file, so relative links (`./`, `../`, same folder) resolve correctly. */
	currentPath?: string | null;
}) {
	const path = target.split("#")[0];
	const pathWithExtension = withMarkdownExtension(path);
	if (pathWithExtension.startsWith("/")) return pathWithExtension;

	// 1. Resolve relative to the current file's folder — a markdown link like
	// `today/README.md` or `../plan.md` is relative to the doc it lives in.
	const baseDir = currentPath ? dirname(currentPath) : null;
	if (baseDir) {
		const resolved = resolveRelative(baseDir, pathWithExtension);
		const relativeMatch = files.find((file) => file.path === resolved);
		if (relativeMatch) return relativeMatch.path;
	}

	// 2. Resolve relative to the workspace root.
	const exactPath = workspacePath
		? joinPath(workspacePath, pathWithExtension)
		: pathWithExtension;
	const exactMatch = files.find((file) => file.path === exactPath);
	if (exactMatch) return exactMatch.path;

	const targetStem = stripMarkdownExtension(path);
	const stemMatch = files.find((file) => {
		const relativePath = relativeWorkspacePath(file.path, workspacePath);
		const relativeStem = stripMarkdownExtension(relativePath);
		const fileStem = relativeStem.split(/[\\/]/).pop() ?? relativeStem;
		return relativeStem === targetStem || fileStem === targetStem;
	});
	return stemMatch?.path ?? exactPath;
}
