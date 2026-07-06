import { Extension } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";

const TableCellAlign = Extension.create({
	name: "tableCellAlign",
	addGlobalAttributes() {
		return [
			{
				types: ["tableHeader", "tableCell"],
				attributes: {
					align: {
						default: null,
						parseHTML: (element) =>
							element.style.textAlign || element.getAttribute("align") || null,
						renderHTML: (attributes) =>
							attributes.align
								? { style: `text-align: ${attributes.align}` }
								: {},
					},
				},
			},
		];
	},
});

export const sudomdTableExtensions = [
	TableKit.configure({ table: { resizable: true } }),
	TableCellAlign,
];
