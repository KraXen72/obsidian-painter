import { App, Editor, Menu } from "obsidian";

export interface Coords {
	top: number;
	left: number;
	right: number;
	bottom: number;
}

export interface EnhancedMenu extends Menu {
	dom: HTMLElement;
}

export interface EnhancedApp extends App {
	commands: { executeCommandById: Function }
}

export interface EnhancedEditor extends Editor {
	cm: CMEditor
	editorComponent: { tableCell: TableCell | null }
	containerEl: HTMLElement,
	editorEl: HTMLElement,
	cursorCoords: Function;
	coordsAtPos: Function;
	hasFocus: () => boolean;
	getSelection: () => string;
}

interface TableCell extends EnhancedEditor {
	tableCell: undefined,
}

interface CMEditor extends CodeMirror.Editor {
	coordsAtPos: Function,
	viewState: {
		state: {
			selection: {
				from: number,
				to: number
			}
		}
	}
}