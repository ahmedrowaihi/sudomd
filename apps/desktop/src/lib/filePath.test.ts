import { describe, expect, it } from "vitest";
import {
	dirname,
	isHiddenSidebarFolderName,
	relativeWorkspacePath,
} from "./filePath";

describe("dirname", () => {
	it("preserves Windows drive roots", () => {
		expect(dirname("C:/index.html")).toBe("C:/");
		expect(dirname("C:\\index.html")).toBe("C:\\");
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

describe("relativeWorkspacePath", () => {
	it("returns an empty path for the workspace root", () => {
		expect(relativeWorkspacePath("/vault", "/vault")).toBe("");
	});
});
