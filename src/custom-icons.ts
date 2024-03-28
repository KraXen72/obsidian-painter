import { addIcon } from "obsidian";
import HighlightrPlugin from "./main";
import { HighlightrSettings } from "./settings/settings-data";

export function createHighlighterIcons(
	settings: HighlightrSettings,
	plugin: HighlightrPlugin
) {
	const highlighterIcons: Record<string, string> = {};

	for (const key of plugin.settings.orderedColors) {
		let highlighterpen = `paintbrush-2-${key}`.toLowerCase();
		highlighterIcons[
			highlighterpen
		] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408-.006L7.096 10.82a1.01 1.01 0 0 0-.273.488l-1.024 4.437L4 18h2.828l1.142-1.129l3.588-.828c.18-.042.345-.133.477-.262l8.667-8.535a1 1 0 0 0 .005-1.42zm-9.369 7.833l-2.121-2.12l7.243-7.131l2.12 2.12l-7.242 7.131zM4 20h16v2H4z" fill="${settings.highlighters[key]}"/></svg>`;
	}

	Object.keys(highlighterIcons).forEach((key) => {
		addIcon(key, highlighterIcons[key]);
	});

	return highlighterIcons;
}
