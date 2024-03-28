export const HIGHLIGHTER_STYLES = [
	"none",
	'text-color',
	"lowlight",
	"floating",
	"rounded",
	"realistic",
];

export const HIGHLIGHTER_METHODS = ["css-classes", "inline-styles"];

export interface Highlighters {
	[color: string]: string;
}

export interface HighlightrSettings {
	highlighterStyle: string;
	highlighterMethods: string;
	highlighters: Highlighters;
	orderedColors: string[];
}

const DEFAULT_SETTINGS: HighlightrSettings = {
	highlighterStyle: "none",
	highlighterMethods: "inline-styles",
	highlighters: {
		"r": "#bf616a",
		"g": "#a3be8c",
		"p": "#b48ead",
		"b": "#81a1c1",
		"aa": "#a5756233",
		"o": "#d08770"
	},
	orderedColors: [],
};

DEFAULT_SETTINGS.orderedColors = Object.keys(DEFAULT_SETTINGS.highlighters);

export default DEFAULT_SETTINGS;
