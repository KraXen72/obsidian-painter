import { HighlightrSettings } from "../settings/settings-data";

export function createStyles(settings: HighlightrSettings) {
	let css = ''
	// const stylesheet = new CSSStyleSheet()
	for (const [key, value] of Object.entries(settings.highlighters)) {
		let keylc = key.toLowerCase();
		css += `
		.hltr-${keylc}, mark.hltr-${keylc}, .markdown-preview-view mark.hltr-${keylc} {
			--hltr-color: ${value};
		}
		`
	}
	removeStyles()
	document.head.createEl('style', { attr: { id: 'painter-styles' }, text: css })
}

export function removeStyles() {
	const el = document.getElementById("painter-styles")
	if (el !== null) el.remove()
}

