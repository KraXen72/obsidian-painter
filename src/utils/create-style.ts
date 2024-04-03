import { HighlightrSettings } from "../settings/settings-data";

export function createStyles(settings: HighlightrSettings) {
	const stylesheet = new CSSStyleSheet()
	for (const [key, value] of Object.entries(settings.highlighters)) {
		let keylc = key.toLowerCase();
		stylesheet.insertRule(`
			.hltr-${keylc}, mark.hltr-${keylc}, .markdown-preview-view mark.hltr-${keylc} {
				--hltr-color: ${value};
			}
		`)
	}
	removeStyles()
	document.adoptedStyleSheets.push(stylesheet)
}

export function removeStyles() {
	for (const ss of document.adoptedStyleSheets) {
		if (Array.from(ss.cssRules).some(rule => rule.cssText.includes('--hltr-color'))) {
			document.adoptedStyleSheets.remove(ss)
		}
	}
}

