import type Painter from "./main";
import { Menu } from "obsidian";
import { HighlightrSettings } from "./settings/settings-data";
import highlighterMenu from "./menu";
import type { EnhancedApp, EnhancedEditor } from "./settings/settings-types";
import type { MenuItem } from "obsidian";
import { actionClear, actionPaint } from "./constants";

export default function contextMenu(
	app: EnhancedApp,
	menu: Menu,
	editor: EnhancedEditor,
	plugin: Painter,
	settings: HighlightrSettings
): void {
	const selection = editor.getSelection();

	menu.addSeparator()
	menu.addItem((item: MenuItem & { dom: HTMLElement }) => {
		item.dom.addClass("painter-plugin-menu-button");
		item
			.setTitle(actionPaint)
			.setIcon("painter-icon")
			.onClick(async () => highlighterMenu(app, settings, editor, plugin.eraseHighlight.bind(plugin)));
	});

	if (!selection) return;
	menu.addItem((item) => {
		item
			.setTitle(actionClear)
			.setIcon("eraser")
			.onClick(() => {
				if (editor.getSelection()) plugin.eraseHighlight(editor);
			});
	});
}
