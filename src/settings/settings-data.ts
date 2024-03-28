export const HIGHLIGHTER_STYLES = [
  "none",
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
    Pink: "#FFB8EBA6",
    Red: "#FF5582A6",
    Orange: "#FFB86CA6",
    Yellow: "#FFF3A3A6",
    Green: "#BBFABBA6",
    Cyan: "#ABF7F7A6",
    Blue: "#ADCCFFA6",
    Purple: "#D2B3FFA6",
    Grey: "#CACFD9A6",
  },
  orderedColors: [],
};

DEFAULT_SETTINGS.orderedColors = Object.keys(DEFAULT_SETTINGS.highlighters);

export default DEFAULT_SETTINGS;
