import { HighlightrSettings } from "../settings/settings-data";
import { setAttributes } from "./setattr";

function addNewStyle(selector: any, style: any, sheet: HTMLElement) {
	sheet.textContent += selector + `{\n ${style}\n}\n\n`;
}

export function createStyles(settings: HighlightrSettings) {
	let styleSheet = document.createElement("style");
	setAttributes(styleSheet, {
		type: "text/css",
		id: "painter-styles",
	});

	let header = document.getElementsByTagName("HEAD")[0];
	header.appendChild(styleSheet);

	Object.keys(settings.highlighters).forEach((highlighter) => {
		let colorLowercase = highlighter.toLowerCase();
		addNewStyle(
			`.hltr-${colorLowercase},\nmark.hltr-${colorLowercase},\n.markdown-preview-view mark.hltr-${colorLowercase}`,
			`--hltr-color: ${settings.highlighters[highlighter]};`,
			styleSheet
		);
	});
}
