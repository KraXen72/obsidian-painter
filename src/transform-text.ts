// MIT LICENSE
// Copyright (c) 2022 Christopher Grieser and contributors
// Copyright (c) 2024-Present KraXen72

// originally written by Chris Grieser for Smarter-markdown hotkeys
// https://github.com/chrisgrieser/obsidian-smarter-md-hotkeys

import type { EnhancedEditor } from "./settings/settings-types";
import type { Editor, EditorPosition, EditorSelection } from "obsidian";
import { isURL } from "./utils";

interface nudgeOpts { ch: number, ln?: number, cursor?: 'from' | 'to' | 'head' | 'anchor' }
const nudgeDefaults: nudgeOpts = { ch: 0, ln: 0, cursor: 'to' } as const

interface wrapOpts { expand?: boolean, moveCursorToEnd?: boolean }
const wrapDefaults: wrapOpts = { expand: true, moveCursorToEnd: false }

const htmlParser = new DOMParser();

export function nudgeCursor(editor: EnhancedEditor, opts: nudgeOpts = nudgeDefaults) {
	const opts2 = Object.assign(nudgeDefaults, opts)
	const prevPos = editor.getCursor(opts2.cursor)
	prevPos.ch += opts2.ch
	if (opts2.ln) prevPos.line += opts2.ln
	editor.setCursor(prevPos)
}

/**
 * remove unwanted HTML elements (by CSS Selectors) from the editor's selection
 * uses a DOMParser to create a sandbox, then removes unwanted elements and replaces the editor selection
 */
export function clearSelectionOfSelectors(editor: Editor, selectors: string[], preserveSelection = false) {
	const oldHead = editor.getCursor('head')
	const currentStr = editor.getSelection();
	const sandbox: Document = htmlParser.parseFromString(currentStr, 'text/html')

	// this function sometimes introduces some wierdness when trying to clean a selection it doesen't need to
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
		sandbox.querySelectorAll(sel).forEach(sel => {
			sel.replaceWith(...Array.from(sel.childNodes))
		})
	}

	// this is only *reading* the sandbox innerHTML, not setting it
	const replacement = sandbox.body.innerHTML
	editor.replaceSelection(replacement);

	if (!editor.hasFocus()) editor.focus();
	if (preserveSelection) editor.setSelection(oldHead, editor.getCursor('head'));
}

const TRIMBEFORE = ["\"", "(", "[", "###### ", "##### ", "#### ", "### ", "## ", "# ", "- [ ] ", "- [x] ", "- ", ">", " ", "\n", "\t"];

// ]( to not break markdown links
// :: preseve dataview inline fields
const TRIMAFTER = ["\"", ")", "](", "::", "]", "\n", "\t", " "];

const EXPANDWHENOUTSIDE = [
	["#", ""],
	["[[", "]]"],
	["", "]]"],
	["[[", ""],
	["\"", "\""],
	["'", "'"],
	["(", ")"],
	["$", ""],
	["", "€"],
	// extra spaces are trimmed seperately later, only there to avoid conflict with TRIM_AFTER values
	["", ": ", "trim_last_space"], // dataview inline field exception
	["[", "] ", "trim_last_space"] // md link exception
];

const IMAGEEXTENSIONS = ["png", "jpg", "jpeg", "gif", "tiff"];

// needed for Chinese Word Delimiter Fix https://github.com/chrisgrieser/obsidian-smarter-md-hotkeys/pull/30
const posEqual = (a: EditorPosition, b: EditorPosition) => a.line === b.line && a.ch === b.ch;
const rangeEqual = (a: EditorSelection, b: EditorSelection) => posEqual(a.anchor, b.anchor) && posEqual(a.head, b.head);

interface contentChange {
	line: number;
	shift: number;
}

export default class TextTransformer {
	editor: EnhancedEditor
	constructor(editor: EnhancedEditor) {
		this.editor = editor
	}
	startOffset() { return this.editor.posToOffset(this.editor.getCursor("from")) }
	endOffset() { return this.editor.posToOffset(this.editor.getCursor("to")) }
	noteLength() { return this.editor.getValue().length }
	offToPos(offset: number) {
		// prevent error when at the start or beginning of document
		if (offset < 0) offset = 0;
		if (offset > this.noteLength()) offset = this.noteLength();
		return this.editor.offsetToPos(offset);
	};
	isOutsideSelection(before: string, after: string) {
		const so = this.startOffset();
		const eo = this.endOffset();

		if (so - before.length < 0) return false; // beginning of the document
		if (eo - after.length > this.noteLength()) return false; // end of the document

		const charsBefore = this.editor.getRange(this.offToPos(so - before.length), this.offToPos(so));
		const charsAfter = this.editor.getRange(this.offToPos(eo), this.offToPos(eo + after.length));
		return charsBefore === before && charsAfter === after;
	}
	isMultiLineMarkup(frontMarkup: string) { return ["`", "%%", "<!--", "$"].includes(frontMarkup) }
	markupOutsideSel(frontMarkup: string, endMarkup: string) { return this.isOutsideSelection(frontMarkup, endMarkup) }
	markupOutsideMultiline(frontMarkup: string, endMarkup: string, anchor: EditorPosition, head: EditorPosition) {
		if (anchor.line === 0) return false;
		if (head.line === this.editor.lastLine()) return false;

		const prevLineContent = this.editor.getLine(anchor.line - 1);
		const followLineContent = this.editor.getLine(head.line + 1);
		return prevLineContent.startsWith(frontMarkup) && followLineContent.startsWith(endMarkup);
	}
	getSel() { return { anchor: this.editor.getCursor("anchor"), head: this.editor.getCursor("head") } }
	noSel() { return !this.editor.somethingSelected() }
	multiLineSel() { return this.editor.getSelection().includes("\n") }
	deleteLine(lineNo: number) {
		// there is no 'next line' when cursor is on the last line
		if (lineNo < this.editor.lastLine()) {
			const lineStart = { line: lineNo, ch: 0 };
			const nextLineStart = { line: lineNo + 1, ch: 0 };
			this.editor.replaceRange("", lineStart, nextLineStart);
		} else {
			const previousLineEnd = { line: lineNo - 1, ch: this.editor.getLine(lineNo).length };
			const lineEnd = { line: lineNo, ch: this.editor.getLine(lineNo).length };
			this.editor.replaceRange("", previousLineEnd, lineEnd);
		}
	}
	textUnderCursor(frontMarkup: string, endMarkup: string, ep: EditorPosition) {
		// prevent underscores (wrongly counted as words) to be expanded to
		if (this.markupOutsideSel(frontMarkup, endMarkup) && this.noSel()) return { anchor: ep, head: ep };

		let endPos, startPos;
		if (frontMarkup !== "`") {
			// https://codemirror.net/doc/manual.html#api_selection
			// https://codemirror.net/6/docs/ref/#state
			// https://github.com/argenos/nldates-obsidian/blob/e6b95969d7215b9ded2b72c4e319e35bc6022199/src/utils.ts#L16
			// https://github.com/obsidianmd/obsidian-api/blob/fac5e67f5d83829a4e0126905494c8cbca27765b/obsidian.d.ts#L787

			// TODO: update for mobile https://github.com/obsidianmd/obsidian-releases/pull/712#issuecomment-1004417481
			if (this.editor.cm instanceof window.CodeMirror) return this.editor.cm.findWordAt(ep); // CM5

			const word = this.editor.cm.state.wordAt(this.editor.posToOffset(ep)); // CM6
			if (!word) return { anchor: ep, head: ep }; // for when there is no word close by

			startPos = this.offToPos(word.from);
			endPos = this.offToPos(word.to);
		}

		// Inline-Code: use only space as delimiter
		if (frontMarkup === "`" || frontMarkup === "$") {
			const so = this.editor.posToOffset(ep);
			let charAfter, charBefore;
			let [i, j, endReached, startReached] = [0, 0, false, false];

			// @ts-ignore
			while (!/\s/.test(charBefore) && !startReached) {
				charBefore = this.editor.getRange(this.offToPos(so - (i + 1)), this.offToPos(so - i));
				i++;
				if (so - (i - 1) === 0) startReached = true;
			}

			// @ts-ignore
			while (!/\s/.test(charAfter) && !endReached) {
				charAfter = this.editor.getRange(this.offToPos(so + j), this.offToPos(so + j + 1));
				j++;
				if (so + (j - 1) === this.noteLength()) endReached = true;
			}

			startPos = this.offToPos(so - (i - 1));
			endPos = this.offToPos(so + (j - 1));
		}

		return { anchor: startPos, head: endPos };
	}
	/** shrinks selection to not include leading & ending whitespace */
	trimSelection(frontMarkup: string, endMarkup: string) {
		let trimAfter = TRIMAFTER;
		let trimBefore = TRIMBEFORE;

		// modify what to trim based on command
		if (this.isMultiLineMarkup(frontMarkup)) {
			trimBefore = [frontMarkup];
			trimAfter = [endMarkup];
		} else if (endMarkup) { // check needed to ensure no special commands are added
			trimBefore.push(frontMarkup);
			trimAfter.push(endMarkup);
		}

		let selection = this.editor.getSelection();
		let so = this.startOffset();

		// before
		let trimFinished = false;
		while (!trimFinished) {
			let cleanCount = 0;
			for (const str of trimBefore) {
				if (selection.startsWith(str)) {
					selection = selection.slice(str.length);
					so += str.length;
				} else {
					cleanCount++;
				}
			}
			if (cleanCount === trimBefore.length || !selection.length) trimFinished = true;
		}

		// after
		trimFinished = false;
		while (!trimFinished) {
			let cleanCount = 0;
			for (const str of trimAfter) {
				if (selection.endsWith(str)) {
					selection = selection.slice(0, -str.length);
				} else {
					cleanCount++;
				}
			}
			if (cleanCount === trimAfter.length || !selection.length) trimFinished = true;
		}

		// block-ID
		const blockID = selection.match(/ \^\w+$/);
		if (blockID) selection = selection.slice(0, -blockID[0].length);

		this.editor.setSelection(this.offToPos(so), this.offToPos(so + selection.length));
	}

	/**
	 * expands & trims the selection
	 * @param frontMarkup prefix
	 * @param endMarkup suffix
	 * @param returnModifiedSelection set this to false if you are using expandSelection internally in TextExtractor?
	 */
	expandSelection(frontMarkup: string, endMarkup: string, returnModifiedSelection = true) {
		this.trimSelection(frontMarkup, endMarkup);

		// expand to word
		const preSelExpAnchor = this.editor.getCursor("from");
		const preSelExpHead = this.editor.getCursor("to");

		const firstWordRange = this.textUnderCursor(frontMarkup, endMarkup, preSelExpAnchor) as CodeMirror.Range;
		let lastWordRange = this.textUnderCursor(frontMarkup, endMarkup, preSelExpHead) as CodeMirror.Range;

		// Chinese Word Delimiter Fix https://github.com/chrisgrieser/obsidian-smarter-md-hotkeys/pull/30
		if (!posEqual(preSelExpAnchor, preSelExpHead) && preSelExpHead.ch > 0) {
			const lastWordRangeInner = this.textUnderCursor(frontMarkup, endMarkup, {
				...preSelExpHead,
				ch: preSelExpHead.ch - 1,
			}) as CodeMirror.Range;
			// if the result of last word range is not the same as the result of
			// head going back one character, use the inner result
			if (!rangeEqual(lastWordRange, lastWordRangeInner)) lastWordRange = lastWordRangeInner;
		}

		this.editor.setSelection(firstWordRange.anchor, lastWordRange.head);
		// console.log("after expandSelection", this.editor.getSelection());
		this.trimSelection(frontMarkup, endMarkup);

		// has to come after trimming to include things like brackets
		const expandWhenOutside = EXPANDWHENOUTSIDE;
		for (const pair of expandWhenOutside) {
			if (pair[0] === frontMarkup || pair[1] === endMarkup) return; // allow undoing of the command creating the syntax
			const trimLastSpace = Boolean(pair[2]);

			if (this.isOutsideSelection(pair[0], pair[1])) {
				firstWordRange.anchor.ch -= pair[0].length;
				lastWordRange.head.ch += pair[1].length;
				if (trimLastSpace) lastWordRange.head.ch--; // to avoid conflicts between trimming and expansion
				this.editor.setSelection(firstWordRange.anchor, lastWordRange.head);
			}
		}
		return returnModifiedSelection
			? { anchor: firstWordRange.anchor, head: lastWordRange.head }
			: { anchor: preSelExpAnchor, head: preSelExpHead }
	}

	recalibratePos(contentChangeList: contentChange[], pos: EditorPosition) {
		for (const change of contentChangeList) {
			if (pos.line === change.line) pos.ch += change.shift;
		}
		return pos;
	}

	async insertURLtoMDLink(frontMarkup: string, endMarkup: string) {
		const clipboardText = (await navigator.clipboard.readText()).trim();

		let frontMarkup_ = frontMarkup;
		let endMarkup_ = endMarkup;
		if (isURL(clipboardText)) {
			endMarkup_ = "](" + clipboardText + ")";
			const urlExtension = clipboardText.split(".").pop();
			if (urlExtension && IMAGEEXTENSIONS.includes(urlExtension)) frontMarkup_ = "![";
		}
		return [frontMarkup_, endMarkup_];
	}

	/** main wrapping function */
	async wrapSelection(frontMarkup: string, endMarkup: string, opts: wrapOpts) {
		const opts2 = Object.assign(wrapDefaults, opts)
		const applyMarkup = (preAnchor: EditorPosition, preHead: EditorPosition, lineMode: string, cleanupSel = true) => {
			let selectedText = this.editor.getSelection();
			const so = this.startOffset();
			let eo = this.endOffset();

			// abort if empty line & multi, since no markup on empty line in between desired
			if (this.noSel() && lineMode === "multi") return;

			// Do Markup
			if (!this.markupOutsideSel(frontMarkup, endMarkup)) {
				// insert extra space for comments
				if (["%%", "<!--"].includes(frontMarkup)) {
					selectedText = " " + selectedText + " ";
					// account for shift in positining for the cursor repositioning
					eo = eo + 2;
					pre_len++;
					suf_len++;
				}
				this.editor.replaceSelection(frontMarkup + selectedText + endMarkup);

				contentChangeList.push(
					{ line: preAnchor.line, shift: pre_len },
					{ line: preHead.line, shift: suf_len }
				);
				preAnchor.ch += pre_len;
				preHead.ch += pre_len;
			}

			// Undo Markup (outside selection, inside not necessary as trimmed already)
			if (this.markupOutsideSel(frontMarkup, endMarkup)) {
				this.editor.setSelection(this.offToPos(so - pre_len), this.offToPos(eo + suf_len));
				this.editor.replaceSelection(selectedText);

				contentChangeList.push(
					{ line: preAnchor.line, shift: -pre_len },
					{ line: preHead.line, shift: -suf_len }
				);
				preAnchor.ch -= pre_len;
				preHead.ch -= pre_len;
			}

			if (lineMode === "single") {
				if (opts2.moveCursorToEnd) {
					nudgeCursor(this.editor, { ch: 1 })
				} else {
					this.editor.setSelection(preAnchor, preHead);
				}
			}
		}

		function wrapMultiLine() {
			const selAnchor = this.editor.getCursor("from");
			selAnchor.ch = 0;
			const selHead = this.editor.getCursor("to");
			selHead.ch = this.editor.getLine(selHead.line).length;

			if (frontMarkup === "`") { // switch to fenced code instead of inline code
				frontMarkup = "```";
				endMarkup = "```";
				suf_len = 3;
				pre_len = 3;
			} else if (frontMarkup === "$") { // switch to block mathjax syntax instead of inline mathjax
				frontMarkup = "$$";
				endMarkup = "$$";
				suf_len = 2;
				pre_len = 2;
			}

			// do Markup
			if (!this.markupOutsideMultiline(selAnchor, selHead)) {
				this.editor.setSelection(selAnchor);
				this.editor.replaceSelection(frontMarkup + "\n");
				selHead.line++; // extra line to account for shift from inserting frontMarkup
				this.editor.setSelection(selHead);
				this.editor.replaceSelection("\n" + endMarkup);

				// when fenced code, position cursor for language definition
				if (frontMarkup === "```") {
					const languageDefPos = selAnchor;
					languageDefPos.ch = 3;
					this.editor.setSelection(languageDefPos);
				}
			}

			// undo Block Markup
			if (this.markupOutsideMultiline(selAnchor, selHead)) {
				this.deleteLine(selAnchor.line - 1);
				this.deleteLine(selHead.line); // not "+1" due to shift from previous line deletion
			}
		}

		// does not have to occur in multi-cursor loop since it already works
		// on every cursor
		if (frontMarkup === "new-line") {
			// @ts-expect-error, not typed
			editor.newlineOnly();
			return;
		}

		// eslint-disable-next-line require-atomic-updates
		if (endMarkup === "]()") [frontMarkup, endMarkup] = await this.insertURLtoMDLink(frontMarkup, endMarkup);
		let pre_len = frontMarkup.length;
		let suf_len = endMarkup.length;

		// saves the amount of position shift for each line
		// used to calculate correct positions for multi-cursor
		const contentChangeList: contentChange[] = [];
		const allCursors = this.editor?.listSelections();

		// sets markup for each cursor/selection
		for (const sel of allCursors) {
			// account for shifts in Editor Positions due to applying markup to previous cursors
			sel.anchor = this.recalibratePos(contentChangeList, sel.anchor);
			sel.head = this.recalibratePos(contentChangeList, sel.head);
			this.editor.setSelection(sel.anchor, sel.head);

			// prevent things like triple-click selection from triggering multi-line
			this.trimSelection(frontMarkup, endMarkup);

			// run special cases instead
			if (!this.multiLineSel()) { // wrap single line selection
				const { anchor: preSelExpAnchor, head: preSelExpHead } = opts2.expand
					? this.expandSelection(frontMarkup, endMarkup, false)!
					: this.getSel();
				applyMarkup(preSelExpAnchor, preSelExpHead, "single");
			} else if (this.multiLineSel() && this.isMultiLineMarkup(frontMarkup)) { // Wrap multi-line selection
				wrapMultiLine();
			} else if (this.multiLineSel() && !this.isMultiLineMarkup(frontMarkup)) { // Wrap *each* line of multi-line selection
				let pointerOff = this.startOffset();
				const lines = this.editor.getSelection().split("\n");
				// get offsets for each line and apply markup to each
				for (const line of lines) {
					this.editor.setSelection(this.offToPos(pointerOff), this.offToPos(pointerOff + line.length));
					const { anchor: preSelExpAnchor, head: preSelExpHead } = opts2.expand
						? this.expandSelection(frontMarkup, endMarkup, false)!
						: this.getSel();

					// Move Pointer to next line
					pointerOff += line.length + 1; // +1 to account for line break
					if (this.markupOutsideSel(frontMarkup, endMarkup)) {
						pointerOff -= pre_len + suf_len; // account for removed markup
					} else {
						pointerOff += pre_len + suf_len; // account for added markup
					};

					applyMarkup(preSelExpAnchor, preSelExpHead, "multi");
				}
			}
		}
	}
}