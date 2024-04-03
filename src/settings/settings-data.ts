export const HIGHLIGHTER_STYLES = [
	"none",
	'text-color',
	"lowlight",
	"floating",
	"rounded",
	"realistic",
] as const;

export const HIGHLIGHTER_METHODS = [
	"css-classes", 
	"inline-styles"
] as const;

export interface Highlighters {
	[color: string]: string;
}

export interface HighlightrSettings {
	highlighterStyle: string;
	highlighterMethods: string;
	highlighters: Highlighters;
	highlighterOrder: string[];
	menuMode: 'normal' | 'minimal';
}

// i'm keeping higlightr's keys so settings can be easily migrated
const DEFAULT_SETTINGS: HighlightrSettings = {
	highlighterStyle: "none",
	highlighterMethods: "css-classes",
	highlighters: {
		"r": "#bf616a",
		"g": "#a3be8c",
		"p": "#b48ead",
		"b": "#81a1c1",
		"aa": "#a5756233",
		"o": "#d08770"
	},
	highlighterOrder: [],
	menuMode: 'normal'
};

DEFAULT_SETTINGS.highlighterOrder = Object.keys(DEFAULT_SETTINGS.highlighters);

export default DEFAULT_SETTINGS;
