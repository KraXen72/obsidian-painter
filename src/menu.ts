import { Menu, Notice } from "obsidian";
import { HighlightrSettings } from "./settings/settings-data";
import type {
	Coords,
	EnhancedApp,
	EnhancedEditor,
	EnhancedMenu,
} from "./settings/settings-types";

const highlighterMenu = (
	app: EnhancedApp,
	settings: HighlightrSettings,
	editor: EnhancedEditor
): void => {
	if (editor && editor.hasFocus()) {
		const cursor = editor.getCursor("from");
		let coords: Coords;

		const menu = new Menu() as EnhancedMenu;
		menu.dom.addClass("painter-plugin-menu-container");

		settings.orderedColors.forEach((color) => {
			menu.addItem((item) => {
				item.setTitle(color);
				item.setIcon(`paintbrush-2-${color}`.toLowerCase());
				item.onClick(() => app.commands.executeCommandById(`highlightr-plugin:${color}`));
			});
		});

		if (editor.cursorCoords) {
			coords = editor.cursorCoords(true, "window");
		} else if (editor.coordsAtPos) {
			const offset = editor.posToOffset(cursor);
			coords = editor.cm.coordsAtPos?.(offset) ?? editor.coordsAtPos(offset);
		} else {
			return;
		}

		menu.showAtPosition({
			x: coords.right + 25,
			y: coords.top + 20,
		});
	} else {
		new Notice("Focus must be in editor");
	}
};

export default highlighterMenu;
