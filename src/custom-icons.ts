import { addIcon } from "obsidian";
import HighlightrPlugin from "./main";
import { HighlightrSettings } from "./settings/settings-data";

export function customHLIcon(color: string) {
	return `<svg version="1.1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
	<g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
		<path d="m9 11-6 6v3h9l3-3" fill="${color}"/>
		<path d="m22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" stroke-width="2.0002"/>
		<path d="m14 4 8 8-8-8" fill="none" stroke="${color}" stroke-linecap="butt" stroke-linejoin="miter" stroke-width="2.0002"/>
	</g>
</svg>`
}

export function createHighlighterIcons(
	settings: HighlightrSettings,
	plugin: HighlightrPlugin
) {
	const highlighterIcons: Record<string, string> = {
		// manually paste in the content's of icon.svg whenever it's updated
		"painter-icon": `<svg version="1.1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"> <path d="m9 11-6 6v3h9l3-3" fill="#000"/> <path d="m22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" stroke-width="2.0002"/> <path d="m14 4 8 8-8-8" fill="none" stroke="#000" stroke-linecap="butt" stroke-linejoin="miter" stroke-width="2.0002"/> </g> </svg>`
	};

	for (const key of plugin.settings.orderedColors) {
		let highlighterpen = `painter-icon-${key}`.toLowerCase();
		highlighterIcons[highlighterpen] = customHLIcon(settings.highlighters[key])
	}

	Object.keys(highlighterIcons).forEach((key) => {
		addIcon(key, highlighterIcons[key]);
	});

	return highlighterIcons;
}
