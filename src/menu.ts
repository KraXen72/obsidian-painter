import { Editor, Menu, Notice } from "obsidian";
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
	editor: EnhancedEditor,
	clearColorFn: Function
): void => {
	if (!editor || !editor.hasFocus()) {
		new Notice("Focus must be in editor");
		return;
	}
	const cursor = editor.getCursor("from");
	let coords: Coords;

	const menu = new Menu() as EnhancedMenu;
	menu.dom.addClass("painter-plugin-menu-container");
	if (settings.menuMode === 'minimal') menu.dom.addClass('minimal'); 

	settings.highlighterOrder.forEach((color) => {
		const lowerCaseColor = color.toLowerCase()
		menu.addItem(item => {
			item.setTitle(color);
			item.setIcon(`painter-icon-${lowerCaseColor}`)
			item.onClick(() => app.commands.executeCommandById(`obsidian-painter:paint-${lowerCaseColor}`));
		});
	});
	if (editor.getSelection()) {
		menu.addSeparator()
		menu.addItem(item => {
			item.setTitle('Clear color')
			item.setIcon('eraser')
			item.onClick(() => clearColorFn(editor))
		})
	}

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
	menu.dom.querySelectorAll('.menu-item').forEach(mi => {
		const ic: HTMLElement | null = mi.querySelector('.menu-item-icon')
		const ti: HTMLElement | null = mi.querySelector('.menu-item-title')
		if (ic === null || ti === null) return;
		ic.title = (ti?.textContent ?? '')
	});
};

export default highlighterMenu;
