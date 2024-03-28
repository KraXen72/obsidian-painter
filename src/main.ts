import { Editor, Menu, Plugin, PluginManifest } from "obsidian";
import { HighlightrSettingTab } from "./settings/settings-tabs";
import { HIGHLIGHTER_STYLES, HighlightrSettings } from "./settings/settings-data";
import DEFAULT_SETTINGS from "./settings/settings-data";
import contextMenu from "./context-menu";
import highlighterMenu from "./menu";
import { createHighlighterIcons } from "./custom-icons";

import { createStyles } from "src/utils/create-style";
import { EnhancedApp, EnhancedEditor } from "./settings/settings-types";

export default class HighlightrPlugin extends Plugin {
	app: EnhancedApp;
	editor: EnhancedEditor;
	manifest: PluginManifest;
	settings: HighlightrSettings;
	parser: DOMParser

	async onload() {
		console.log(`Painter v${this.manifest.version} loaded`);

		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {
			this.reloadStyles(this.settings);
			createHighlighterIcons(this.settings, this);
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", this.handleHighlighterInContextMenu)
		);

		this.addSettingTab(new HighlightrSettingTab(this.app, this));

		this.addCommand({
			id: "open-menu",
			name: "Open Painter Menu",
			icon: "painter-icon",
			editorCallback: (editor: EnhancedEditor) => {
				!document.querySelector(".menu.painter-plugin-menu-container")
					? highlighterMenu(this.app, this.settings, editor, this.eraseHighlight)
					: true;
			},
		});

		addEventListener("painter:refreshstyles", () => {
			this.reloadStyles(this.settings);
			this.generateCommands(this.editor);
			createHighlighterIcons(this.settings, this);
		});
		this.generateCommands(this.editor);
		this.refresh();
		this.parser = new DOMParser();
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

	eraseHighlight = (editor: Editor) => {
		// to remove any mark elements, we use DOMParser to create a sandbox
		// then, remove any mark elements & read the result to set it back
		const currentStr = editor.getSelection();
		const sandbox = this.parser.parseFromString(currentStr, 'text/html')
		sandbox.querySelectorAll('mark').forEach(m => {
			m.replaceWith(document.createTextNode(m.innerHTML))
		})
		editor.replaceSelection(sandbox.body.innerHTML); // this is only *reading* the innerHTML, not setting it
		editor.focus();

		// const newStr = currentStr
		// 	.replace(/<mark style.*?[^>]>/g, "")
		// 	.replace(/<mark class.*?[^>]>/g, "")
		// 	.replace(/<\/mark>/g, "");
	};

	generateCommands(editor: Editor) {
		this.settings.orderedColors.forEach((highlighterKey: string) => {
			const lowerCaseColor = highlighterKey.toLowerCase()
			const applyCommand = (command: CommandPlot, editor: Editor) => {
				const selectedText = editor.getSelection();
				const curserStart = editor.getCursor("from");
				const curserEnd = editor.getCursor("to");
				const prefix = command.prefix;
				const suffix = command.suffix || prefix;
				const setCursor = (mode: number) => {
					editor.setCursor(
						curserStart.line + command.line * mode,
						curserEnd.ch + cursorPos * mode
					);
				};
				const cursorPos =
					selectedText.length > 0
						? prefix.length + suffix.length + 1
						: prefix.length;
				const preStart = {
					line: curserStart.line - command.line,
					ch: curserStart.ch - prefix.length,
				};
				const pre = editor.getRange(preStart, curserStart);

				const sufEnd = {
					line: curserStart.line + command.line,
					ch: curserEnd.ch + suffix.length,
				};

				const suf = editor.getRange(curserEnd, sufEnd);

				const preLast = pre.slice(-1);
				const prefixLast = prefix.trimStart().slice(-1);
				const sufFirst = suf[0];

				if (suf === suffix.trimEnd()) {
					if (preLast === prefixLast && selectedText) {
						editor.replaceRange(selectedText, preStart, sufEnd);
						const changeCursor = (mode: number) => {
							editor.setCursor(
								curserStart.line + command.line * mode,
								curserEnd.ch + (cursorPos * mode + 8)
							);
						};
						return changeCursor(-1);
					}
				}

				editor.replaceSelection(`${prefix}${selectedText}${suffix}`);

				return setCursor(1);
			};

			type CommandPlot = {
				char: number;
				line: number;
				prefix: string;
				suffix: string;
			};

			type commandsPlot = {
				[key: string]: CommandPlot;
			};

			const commandsMap: commandsPlot = {
				highlight: {
					char: 34,
					line: 0,
					prefix:
						this.settings.highlighterMethods === "css-classes"
							? `<mark class="hltr-${highlighterKey.toLowerCase()}">`
							: `<mark style="background-color:${this.settings.highlighters[highlighterKey]}">`,
					suffix: "</mark>",
				},
			};

			Object.keys(commandsMap).forEach((type) => {
				this.addCommand({
					id: `paint-${lowerCaseColor}`,
					name: highlighterKey,
					icon: `painter-icon-${lowerCaseColor}`,
					editorCallback: async (editor: Editor) => {
						applyCommand(commandsMap[type], editor);
					},
				});
			});

			this.addCommand({
				id: "remove-highlight",
				name: "Clear color",
				icon: "eraser",
				editorCallback: async (editor: Editor) => {
					this.eraseHighlight(editor);
					editor.focus();
				},
			});
		});
	}

	refresh = () => {
		this.updateStyle();
	};

	updateStyle = () => {
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

	handleHighlighterInContextMenu = (
		menu: Menu,
		editor: EnhancedEditor
	): void => {
		contextMenu(this.app, menu, editor, this, this.settings);
	};

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
