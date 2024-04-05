import { Plugin } from "obsidian";
import type { PluginManifest, Menu, Editor } from "obsidian";
import type { EnhancedApp, EnhancedEditor } from "./settings/settings-types";

import { PainterSettingTab } from "./settings/settings-tabs";
import DEFAULT_SETTINGS, { HIGHLIGHTER_STYLES, HighlightrSettings } from "./settings/settings-data";
import highlighterMenu from "./menu";
import contextMenu from "./context-menu";
import { createHighlighterIcons } from "./custom-icons";
import { createStyles, removeStyles } from "./utils/create-style";
import TextTransformer from "./transform-text";
import { actionClear, actionMenu } from "./constants";

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
			name: actionMenu,
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

	clearSelectionOfSelectors(editor: Editor, selectors: string[], preserveSelection = false) {
		// to remove unwanted elements, we use DOMParser to create a sandbox
		// then, remove unwanted elements & read the result to set it back
		// this is only *reading* the innerHTML, not setting it
		const oldHead = editor.getCursor('head')
		const currentStr = editor.getSelection();
		const sandbox = this.parser.parseFromString(currentStr, 'text/html')

		// this function introduces some wierdness when trying to clean stuff it doesen't need to
		// better to skip cleaning entirely if unneeded
		let canSkip = true
		for (const sel of selectors) {
			if (sandbox.querySelectorAll(sel).length > 0) {
				canSkip = false
				break;
			}
		}
		if (canSkip) return;

		for (const sel of selectors) {
			sandbox.querySelectorAll(sel).forEach(m => {
				m.replaceWith(...Array.from(m.childNodes))
			})
		}
		const replacement = sandbox.body.innerHTML
		editor.replaceSelection(replacement);
		if (!editor.hasFocus()) editor.focus();
		if (preserveSelection) editor.setSelection(oldHead, editor.getCursor('head'));
	}
	
	eraseHighlight(editor: Editor) {
		this.clearSelectionOfSelectors(editor, [...this.settings.cleanSelectors, 'mark'])
	};

	createPrefix(elem: string, key: string, mode: string, style: string) {
		const styleKey = style === 'text-color' ? 'color' : 'background-color';
		const attr = mode === "css-classes" 
			? `class="hltr-${key.toLowerCase()}"` 
			: `style="${styleKey}:${this.settings.highlighters[key]}"`;
		return `<${elem} ${attr}>`
	}

	applyCommand(command: CommandPlot, editor: EnhancedEditor) {
		const prefix = command.prefix;
		const suffix = command.suffix || prefix;
		if (this.settings.overwriteMarks) this.clearSelectionOfSelectors(editor, ['mark'], true);

		const transformer = new TextTransformer(editor)
		transformer.trimSelection(prefix, suffix)
		transformer.wrapSelection(prefix, suffix, { 
			expand: editor.getSelection().length === 0,
			moveCursorToEnd: true 
		})
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
				name: actionClear,
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
		removeStyles()
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
