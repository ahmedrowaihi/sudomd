import { describe, expect, it } from "vitest";
import { hasDocumentExtension, isHiddenSidebarFolderName } from "./filePath";

describe("hasDocumentExtension", () => {
	it("matches files with rich and source viewer modes", () => {
		expect(hasDocumentExtension("note.md")).toBe(true);
		expect(hasDocumentExtension("app.html")).toBe(true);
		expect(hasDocumentExtension("app.HTM")).toBe(true);
		expect(hasDocumentExtension("image.png")).toBe(false);
	});
});

describe("isHiddenSidebarFolderName", () => {
	it("matches app-owned directories excluded from the sidebar", () => {
		expect(isHiddenSidebarFolderName(".hubble")).toBe(true);
		expect(isHiddenSidebarFolderName("note.assets")).toBe(true);
		expect(isHiddenSidebarFolderName("note.assets.backup")).toBe(false);
		expect(isHiddenSidebarFolderName("assets")).toBe(false);
	});
});
