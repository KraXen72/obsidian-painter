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
			item.setTitle('Clear')
			item.setIcon('eraser')
			item.onClick(() => clearColorFn(editor))
		})
	}
	
	const offset = editor.posToOffset(cursor)
	let coords: Coords = editor.cm.coordsAtPos(offset)
	const tc = editor.editorComponent.tableCell
	if (tc && tc.editorEl !== null) {
		const rect = tc.editorEl.getBoundingClientRect()
		menu.showAtPosition({
			x: rect.x + 25,
			y: rect.y + 20
		})
	} else {
		menu.showAtPosition({
			x: coords.right + 25,
			y: coords.top + 20,
		});
	}
	
	menu.dom.querySelectorAll('.menu-item').forEach(mi => {
		const ic: HTMLElement | null = mi.querySelector('.menu-item-icon')
		const ti: HTMLElement | null = mi.querySelector('.menu-item-title')
		if (ic === null || ti === null) return;
		ic.title = (ti?.textContent ?? '')
	});
};

export default highlighterMenu;
