import { Plugin } from "obsidian";
import type { PluginManifest, Menu, Editor } from "obsidian";
import type { EnhancedApp, EnhancedEditor } from "./settings/settings-types";

import { PainterSettingTab } from "./settings/settings-tabs";
import DEFAULT_SETTINGS, { HIGHLIGHTER_STYLES, HighlightrSettings } from "./settings/settings-data";
import contextMenu from "./context-menu";
import highlighterMenu from "./menu";
import { createHighlighterIcons } from "./custom-icons";
import { createStyles } from "./utils/create-style";
import { TextTransformer, nudgeCursor } from "./transform-text";

type CommandPlot = {
	char: number;
	line: number;
	prefix: string;
	suffix: string;
};

export default class Painter extends Plugin {
	app: EnhancedApp;
	editor: EnhancedEditor;
	manifest: PluginManifest;
	settings: HighlightrSettings;
	parser: DOMParser

	async onload() {
		console.log(`Painter v${this.manifest.version} loaded`);
		this.parser = new DOMParser();

		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {
			this.reloadStyles(this.settings);
			createHighlighterIcons(this.settings, this);
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", this.handleHighlighterInContextMenu.bind(this))
		);
		
		this.addSettingTab(new PainterSettingTab(this.app, this));

		this.addCommand({
			id: "open-menu",
			name: "Open Painter Menu",
			icon: "painter-icon",
			editorCallback: (editor: EnhancedEditor) => {
				if (document.querySelector(".menu.painter-plugin-menu-container")) return;
				highlighterMenu(this.app, this.settings, editor, this.eraseHighlight.bind(this))
			},
		});

		addEventListener("painter:refreshstyles", () => {
			this.reloadStyles(this.settings);
			this.generateCommands(this.editor);
			createHighlighterIcons(this.settings, this);
		});
		this.generateCommands(this.editor);
		this.refresh();
	}

	reloadStyles(settings: HighlightrSettings) {
		let currentSheet = document.querySelector("style#highlightr-styles");
		if (currentSheet) {
			currentSheet.remove();
			createStyles(settings);
		} else {
			createStyles(settings);
		}
	}

	eraseHighlight(editor: Editor) {
		// to remove any mark elements, we use DOMParser to create a sandbox
		// then, remove any mark elements & read the result to set it back
		// this is only *reading* the innerHTML, not setting it
		const currentStr = editor.getSelection();
		const sandbox = this.parser.parseFromString(currentStr, 'text/html')
		sandbox.querySelectorAll('mark').forEach(m => {
			m.replaceWith(...Array.from(m.childNodes))
		})
		editor.replaceSelection(sandbox.body.innerHTML);
		editor.focus();
	};

	createPrefix(elem: string, key: string, mode: string, style: string) {
		const styleKey = style === 'text-color' ? 'color' : 'background-color';
		const attr = mode === "css-classes" 
			? `class="hltr-${key.toLowerCase()}"` 
			: `style="${styleKey}:${this.settings.highlighters[key]}"`;
		return `<${elem} ${attr}>`
	}

	applyCommand(command: CommandPlot, editor: EnhancedEditor) {
		// const cursorStart = editor.getCursor("from");
		// const cursorEnd = editor.getCursor("to");
		const prefix = command.prefix;
		const suffix = command.suffix || prefix;
		const transformer = new TextTransformer(editor)

		// if (editor.getSelection().length === 0) { // expand to full word
		// 	const newSel = transformer.expandSelection(prefix, suffix);
		// 	if (typeof newSel === "undefined") return;
		// 	const { anchor, head } = newSel;
		// 	editor.setSelection(anchor, head)
		// }
		transformer.trimSelection(prefix, suffix)
		transformer.wrapSelection(prefix, suffix, { expand: editor.getSelection().length === 0, moveCursorToEnd: true } )

		// editor.replaceSelection(`${prefix}${editor.getSelection()}${suffix}`);
		// nudgeCursor(editor, { ch: 1 })
	};

	generateCommands(passedEditor: EnhancedEditor) {
		for (const highlighterKey of this.settings.highlighterOrder) {
			const lowerCaseColor = highlighterKey.toLowerCase()
			const command = {
				char: 0,
				line: 0,
				prefix: this.createPrefix('mark', highlighterKey, this.settings.highlighterMethods, this.settings.highlighterStyle),
				suffix: "</mark>",
			}

			this.addCommand({
				id: `paint-${lowerCaseColor}`,
				name: highlighterKey,
				icon: `painter-icon-${lowerCaseColor}`,
				editorCallback: async (editor: EnhancedEditor) => {
					this.applyCommand(command, editor);
				},
			});

			this.addCommand({
				id: "remove-highlight",
				name: "Clear",
				icon: "eraser",
				editorCallback: async (editor: Editor) => {
					this.eraseHighlight(editor);
					editor.focus();
				},
			});
		};
	}

	refresh() {
		this.updateStyle();
	};

	updateStyle() {
		for (const style of HIGHLIGHTER_STYLES) {
			document.body.classList.toggle(
				`highlightr-${style}`,
				this.settings.highlighterStyle === style
			);
		}
	};

	onunload() {
		console.log("Painter unloaded");
	}

	handleHighlighterInContextMenu(
		menu: Menu,
		editor: EnhancedEditor
	) {
		contextMenu(this.app, menu, editor, this, this.settings);
	};

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
