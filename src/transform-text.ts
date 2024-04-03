import type { EnhancedEditor } from "./settings/settings-types";
import type { EditorPosition, EditorSelection } from "obsidian";

// credit for original code: https://github.com/chrisgrieser/obsidian-smarter-md-hotkeys (modified)
// turned it into a class which remembers the editor instance it was initialized with
// it might be overkill but i cannot be bothered to pass in the editor every time

// TODO replace with something else?
const URL_REGEX = /^((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()[\]{};:'".,<>?«»“”‘’]))$/i;

const TRIMBEFORE = ["\"", "(", "[", "###### ", "##### ", "#### ", "### ", "## ", "# ", "- [ ] ", "- [x] ", "- ", ">", " ", "\n", "\t"];

// TODO cleanup

const TRIMAFTER = [
	"\"",
	")",
	"](", // to not break markdown links
	"::", // preseve dataview inline fields
	"]",
	"\n",
	"\t",
	" "
];

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

// TODO remove unneeded util functions
// TODO Fix missing this.references
// TODO make expandSelection work from outside

class TextTransformer {
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
	isOutsideSel(bef:string, aft:string) {
		const so = this.startOffset();
		const eo = this.endOffset();

		if (so - bef.length < 0) return false; // beginning of the document
		if (eo - aft.length > this.noteLength()) return false; // end of the document

		const charsBefore = this.editor.getRange(this.offToPos(so - bef.length), this.offToPos(so));
		const charsAfter = this.editor.getRange(this.offToPos(eo), this.offToPos(eo + aft.length));
		return charsBefore === bef && charsAfter === aft;
	}
	isMultiLineMarkup(frontMarkup: string) { return ["`", "%%", "<!--", "$"].includes(frontMarkup) }
	markupOutsideSel(frontMarkup: string, endMarkup: string) { return this.isOutsideSel(frontMarkup, endMarkup) }
	markupOutsideMultiline(frontMarkup: string, endMarkup: string, anchor: EditorPosition, head: EditorPosition) {
		if (anchor.line === 0) return false;
		if (head.line === this.editor.lastLine()) return false;

		const prevLineContent = this.editor.getLine(anchor.line - 1);
		const followLineContent = this.editor.getLine(head.line + 1);
		return prevLineContent.startsWith(frontMarkup) && followLineContent.startsWith(endMarkup);
	}
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

			const word = this.editor.cm.state.wordAt(this.editor.posToOffset (ep)); // CM6
			if (!word) return { anchor: ep, head: ep }; // for when there is no word close by

			startPos = this.offToPos(word.from);
			endPos = this.offToPos(word.to);
		}

		// Inline-Code: use only space as delimiter
		if (frontMarkup === "`" || frontMarkup === "$") {
			console.log ("Getting Code under Cursor");
			const so = this.editor.posToOffset(ep);
			let charAfter, charBefore;
			let [i, j, endReached, startReached] = [0, 0, false, false];

			// @ts-ignore
			while (!/\s/.test(charBefore) && !startReached) {
				charBefore = this.editor.getRange(this.offToPos(so - (i+1)), this.offToPos(so - i));
				i++;
				if (so - (i - 1) === 0) startReached = true;
			}

			// @ts-ignore
			while (!/\s/.test(charAfter) && !endReached) {
				charAfter = this.editor.getRange(this.offToPos(so + j), this.offToPos(so + j+1));
				j++;
				if (so+(j-1) === this.noteLength()) endReached = true;
			}

			startPos = this.offToPos(so - (i-1));
			endPos = this.offToPos(so + (j-1));
		}

		return { anchor: startPos, head: endPos };
	}
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
		console.log ("before trim", true);

		// before
		let trimFinished = false;
		while (!trimFinished) {
			let cleanCount = 0;
			trimBefore.forEach(str => {
				if (selection.startsWith(str)) {
					selection = selection.slice(str.length);
					so += str.length;
				}
				else cleanCount++;

			});
			if (cleanCount === trimBefore.length || !selection.length) trimFinished = true;
		}

		// after
		trimFinished = false;
		while (!trimFinished) {
			let cleanCount = 0;
			trimAfter.forEach((str) => {
				if (selection.endsWith(str)) selection = selection.slice(0, -str.length);
				else cleanCount++;
			});
			if (cleanCount === trimAfter.length || !selection.length) trimFinished = true;
		}

		// block-ID
		const blockID = selection.match(/ \^\w+$/);
		if (blockID) selection = selection.slice(0, -blockID[0].length);

		this.editor.setSelection(this.offToPos(so), this.offToPos(so + selection.length));
		console.log ("after trim", true);
	}
	expandSelection(frontMarkup: string, endMarkup: string) {
		this.trimSelection(frontMarkup, endMarkup);
		console.log("before expandSelection", true);

		// expand to word
		const preSelExpAnchor = this.editor.getCursor("from");
		const preSelExpHead = this.editor.getCursor("to");

		const firstWordRange = this.textUnderCursor(frontMarkup, endMarkup, preSelExpAnchor) as CodeMirror.Range;
		let lastWordRange = this.textUnderCursor(frontMarkup, endMarkup, preSelExpHead) as CodeMirror.Range;

		// Chinese Word Delimiter Fix https://github.com/chrisgrieser/obsidian-smarter-md-hotkeys/pull/30
		if (!posEqual(preSelExpAnchor, preSelExpHead) && preSelExpHead.ch > 0 ) {
			const lastWordRangeInner = this.textUnderCursor(frontMarkup, endMarkup, {
				...preSelExpHead,
				ch: preSelExpHead.ch - 1,
			}) as CodeMirror.Range;
			// if the result of last word range is not the same as the result of
			// head going back one character, use the inner result
			if (!rangeEqual(lastWordRange, lastWordRangeInner)) lastWordRange = lastWordRangeInner;
		}

		this.editor.setSelection(firstWordRange.anchor, lastWordRange.head);
		console.log ("after expandSelection", true);
		this.trimSelection(frontMarkup, endMarkup);

		// has to come after trimming to include things like brackets
		const expandWhenOutside = EXPANDWHENOUTSIDE;
		expandWhenOutside.forEach(pair => {
			if (pair[0] === frontMarkup || pair[1] === endMarkup) return; // allow undoing of the command creating the syntax
			const trimLastSpace = Boolean(pair[2]);

			if (this.isOutsideSel(pair[0], pair[1])) {
				firstWordRange.anchor.ch -= pair[0].length;
				lastWordRange.head.ch += pair[1].length;
				if (trimLastSpace) lastWordRange.head.ch--; // to avoid conflicts between trimming and expansion
				this.editor.setSelection(firstWordRange.anchor, lastWordRange.head);
			}
		});


		return { anchor: preSelExpAnchor, head: preSelExpHead };
	}
	recalibratePos (contentChangeList: contentChange[], pos: EditorPosition) {
		contentChangeList.forEach(change => {
			if (pos.line === change.line) pos.ch += change.shift;
		});
		return pos;
	}
	

	async expandAndWrap(frontMarkup: string, endMarkup: string, editor: EnhancedEditor) {
		function applyMarkup(frontMarkup: string, endMarkup: string, preAnchor: EditorPosition, preHead: EditorPosition, lineMode: string ) {
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
					blen++;
					alen++;
				}
				editor.replaceSelection(frontMarkup + selectedText + endMarkup);
	
				contentChangeList.push(
					{ line: preAnchor.line, shift: blen },
					{ line: preHead.line, shift: alen }
				);
				preAnchor.ch += blen;
				preHead.ch += blen;
			}
	
			// Undo Markup (outside selection, inside not necessary as trimmed already)
			if (this.markupOutsideSel()) {
				editor.setSelection(this.offToPos(so - blen), this.offToPos(eo + alen));
				editor.replaceSelection(selectedText);
	
				contentChangeList.push(
					{ line: preAnchor.line, shift: -blen },
					{ line: preHead.line, shift: -alen }
				);
				preAnchor.ch -= blen;
				preHead.ch -= blen;
			}
	
			if (lineMode === "single") editor.setSelection(preAnchor, preHead);
		}

		function wrapMultiLine() {
			const selAnchor = editor.getCursor("from");
			selAnchor.ch = 0;
			const selHead = editor.getCursor("to");
			selHead.ch = editor.getLine(selHead.line).length;
	
			if (frontMarkup === "`") { // switch to fenced code instead of inline code
				frontMarkup = "```";
				endMarkup = "```";
				alen = 3;
				blen = 3;
			}
			else if (frontMarkup === "$") { // switch to block mathjax syntax instead of inline mathjax
				frontMarkup = "$$";
				endMarkup = "$$";
				alen = 2;
				blen = 2;
			}
	
			// do Markup
			if (!markupOutsideMultiline(selAnchor, selHead)) {
				editor.setSelection(selAnchor);
				editor.replaceSelection(frontMarkup + "\n");
				selHead.line++; // extra line to account for shift from inserting frontMarkup
				editor.setSelection(selHead);
				editor.replaceSelection("\n" + endMarkup);
	
				// when fenced code, position cursor for language definition
				if (frontMarkup === "```") {
					const languageDefPos = selAnchor;
					languageDefPos.ch = 3;
					editor.setSelection(languageDefPos);
				}
			}
	
			// undo Block Markup
			if (markupOutsideMultiline(selAnchor, selHead)) {
				deleteLine(selAnchor.line - 1);
				deleteLine(selHead.line); // not "+1" due to shift from previous line deletion
			}
		}
	
		async function insertURLtoMDLink() {
			const URLregex = URL_REGEX;
			const cbText = (await navigator.clipboard.readText()).trim();
	
			let frontMarkup_ = frontMarkup;
			let endMarkup_ = endMarkup;
			if (URLregex.test(cbText)) {
				endMarkup_ = "](" + cbText + ")";
				const urlExtension = cbText.split(".").pop();
				if (urlExtension && IMAGEEXTENSIONS.includes(urlExtension)) frontMarkup_ = "![";
			}
			return [frontMarkup_, endMarkup_];
		}
		let doIt = true;
	
		// MAIN
		//-------------------------------------------------------------------
		console.log("\nSmarterMD Hotkeys triggered\n---------------------------");
	
		// does not have to occur in multi-cursor loop since it already works
		// on every cursor
		if (frontMarkup === "new-line") {
			// @ts-expect-error, not typed
			editor.newlineOnly();
			return;
		}
	
		// eslint-disable-next-line require-atomic-updates
		if (endMarkup === "]()") [frontMarkup, endMarkup] = await insertURLtoMDLink();
		let blen = frontMarkup.length;
		let alen = endMarkup.length;
	
		// saves the amount of position shift for each line
		// used to calculate correct positions for multi-cursor
		const contentChangeList: contentChange[] = [];
		const allCursors = editor?.listSelections();
	
		// sets markup for each cursor/selection
		allCursors.forEach(sel => {
			// account for shifts in Editor Positions due to applying markup to previous cursors
			sel.anchor = this.recalibratePos(sel.anchor);
			sel.head = this.recalibratePos(sel.head);
			editor.setSelection(sel.anchor, sel.head);
	
			// prevent things like triple-click selection from triggering multi-line
			this.trimSelection();
	
			// run special cases instead
			if (!this.multiLineSel()) { // wrap single line selection
				console.log("single line");
				const { anchor: preSelExpAnchor, head: preSelExpHead } = this.expandSelection();
				this.applyMarkup(preSelExpAnchor, preSelExpHead, "single");
			}	else if (this.multiLineSel() && this.isMultiLineMarkup()) { // Wrap multi-line selection
				console.log("Multiline Wrap");
				this.wrapMultiLine();
			}	else if (this.multiLineSel() && !this.isMultiLineMarkup()) { // Wrap *each* line of multi-line selection
				let pointerOff = this.startOffset();
				const lines = editor.getSelection().split("\n");
				console.log("lines: " + lines.length.toString());
	
				// get offsets for each line and apply markup to each
				lines.forEach(line => {
					console.log("");
					editor.setSelection(this.offToPos(pointerOff), this.offToPos(pointerOff + line.length));
	
					const { anchor: preSelExpAnchor, head: preSelExpHead } = this.expandSelection();
	
					// Move Pointer to next line
					pointerOff += line.length + 1; // +1 to account for line break
					if (this.markupOutsideSel()) pointerOff -= blen + alen; // account for removed markup
					else pointerOff += blen + alen; // account for added markup
	
					this.applyMarkup(preSelExpAnchor, preSelExpHead, "multi");
				});
			}
		});
	
	}
}