import { describe, expect, it } from "vitest";
import { indexMovedFiles, pathAfterMove } from "./markdownLinkRewrite";

describe("pathAfterMove", () => {
	it("matches descendants when moved paths use Windows separators", () => {
		const movedByOldPath = indexMovedFiles([
			{
				fromPath: "C:\\workspace\\note.assets",
				toPath: "C:\\workspace\\renamed.assets",
			},
		]);

		expect(
			pathAfterMove("C:/workspace/note.assets/image.png", movedByOldPath),
		).toBe("C:/workspace/renamed.assets/image.png");
	});
});
