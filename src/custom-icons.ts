import { addIcon } from "obsidian";
import HighlightrPlugin from "./main";
import { HighlightrSettings } from "./settings/settings-data";

export function customHLIcon(color: string) {
	const svg = createSvg('svg', { attr: {
		version: '1.1',
		viewBox: "0 0 24 24",
		xmlns: 'http://www.w3.org/2000/svg'
	} })
	const g = svg.createSvg('g', { attr: {
		fill: 'none',
		stroke: color,
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
		'stroke-width': 2
	}})
	g.createSvg('path', { attr: { d: "m9 11-6 6v3h9l3-3", fill: color } })
	g.createSvg('path', { attr: { d: "m22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" }})
	g.createSvg('path', { attr: { d: "m14 4 8 8-8-8", fill: 'none', stroke: color, 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' } })
	return svg
}

export function createHighlighterIcons(
	settings: HighlightrSettings,
	plugin: HighlightrPlugin
) {
	const highlighterIcons: Record<string, SVGElement> = {
		// manually paste in the content's of icon.svg whenever it's updated
		"painter-icon": customHLIcon('currentColor')
	};

	for (const key of plugin.settings.highlighterOrder) {
		let highlighterpen = `painter-icon-${key}`.toLowerCase();
		highlighterIcons[highlighterpen] = customHLIcon(settings.highlighters[key])
	}

	Object.keys(highlighterIcons).forEach((key) => {
		// we are only *reading* the outerHTML of our dynamically created svg
		addIcon(key, highlighterIcons[key].outerHTML); 
	});

	return highlighterIcons;
}
