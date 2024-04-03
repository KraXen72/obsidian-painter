import { Editor, Menu, Plugin, PluginManifest } from "obsidian";
import { HighlightrSettingTab } from "./settings/settings-tabs";
import { HIGHLIGHTER_METHODS, HIGHLIGHTER_STYLES, HighlightrSettings } from "./settings/settings-data";
import DEFAULT_SETTINGS from "./settings/settings-data";
import contextMenu from "./context-menu";
import highlighterMenu from "./menu";
import { createHighlighterIcons } from "./custom-icons";

import { createStyles } from "src/utils/create-style";
import { EnhancedApp, EnhancedEditor } from "./settings/settings-types";
import { expandAndWrap, nudgeCursor } from "./transform-text";

type CommandPlot = {
	char: number;
	line: number;
	prefix: string;
	suffix: string;
};

type commandsPlot = {
	[key: string]: CommandPlot;
};

export default class HighlightrPlugin extends Plugin {
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

		this.addSettingTab(new HighlightrSettingTab(this.app, this));

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

	generateCommands(passedEditor: EnhancedEditor) {
		for (const highlighterKey of this.settings.highlighterOrder) {
			const lowerCaseColor = highlighterKey.toLowerCase()

			const applyCommand = (command: CommandPlot, editor: EnhancedEditor) => {
				const selectedText = editor.getSelection();
				const cursorStart = editor.getCursor("from");
				const cursorEnd = editor.getCursor("to");
				const prefix = command.prefix;
				const suffix = command.suffix || prefix;

				const cursorPos =
					selectedText.length > 0
						? prefix.length + suffix.length + 1
						: prefix.length;

				const prefixStart = {
					line: cursorStart.line - command.line,
					ch: cursorStart.ch - prefix.length,
				};
				
				const suffixEnd = {
					line: cursorStart.line + command.line,
					ch: cursorEnd.ch + suffix.length,
				};
				
				const pre = editor.getRange(prefixStart, cursorStart);
				const suf = editor.getRange(cursorEnd, suffixEnd);

				const preLast = pre.slice(-1);
				const prefixLast = prefix.trimStart().slice(-1);

				// console.table({ selectedText, cursorStart, cursorEnd, cursorPos, prefix, prefixStart, suffix, suffixEnd, pre, suf })
				// if (suf === suffix.trimEnd() && (preLast === prefixLast && selectedText)) {
				// 	console.log('replacing range')
				// 	editor.replaceRange(selectedText, prefixStart, suffixEnd);
				// 	return changeCursor(-1);
				// }
				editor.replaceSelection(`${prefix}${selectedText}${suffix}`);
				nudgeCursor(editor, { ch: 1 })
				// return setCursor(1);
			};

			const commandsMap: commandsPlot = {
				highlight: {
					char: 0, // 34
					line: 0,
					prefix: this.createPrefix('mark', highlighterKey, this.settings.highlighterMethods, this.settings.highlighterStyle),
					suffix: "</mark>",
				},
			};

			for (const type in commandsMap) {
				this.addCommand({
					id: `paint-${lowerCaseColor}`,
					name: highlighterKey,
					icon: `painter-icon-${lowerCaseColor}`,
					editorCallback: async (editor: EnhancedEditor) => {
						applyCommand(commandsMap[type], editor);
						// expandAndWrap(commandsMap[type].prefix, commandsMap[type].suffix, editor);
					},
				});
			}

			this.addCommand({
				id: "remove-highlight",
				name: "Clear color",
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
