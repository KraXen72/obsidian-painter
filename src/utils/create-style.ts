import { HighlightrSettings } from "../settings/settings-data";

let painterSheet: CSSStyleSheet | null = null;

export function createStyles(settings: HighlightrSettings) {
	let css = ''
	for (const [key, value] of Object.entries(settings.highlighters)) {
		let keylc = key.toLowerCase();
		css += `
		.hltr-${keylc}, mark.hltr-${keylc}, .markdown-preview-view mark.hltr-${keylc} {
			--hltr-color: ${value};
		}
		`
	}
	removeStyles()

	const nextSheet = new CSSStyleSheet();
	nextSheet.replaceSync(css);
	document.adoptedStyleSheets = [...document.adoptedStyleSheets, nextSheet];
	painterSheet = nextSheet;
}

export function removeStyles() {
	if (painterSheet !== null) {
		document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
			(sheet) => sheet !== painterSheet
		);
		painterSheet = null;
	}

	// Cleanup for legacy style-tag based versions.
	document.getElementById("painter-styles")?.remove();
	document.getElementById("highlightr-styles")?.remove();
}
