import type { EnhancedEditor } from "src/settings/settings-types";

export function numToHexSuffix(num: number) {
	const repr = num.toString(16)
	if (repr.length === 1) return '0' + repr;
	return repr;
}

export const sample = (arr: unknown[]) => arr[Math.floor(Math.random() * arr.length)];

type nudgeOpts = { ch: number, ln?: number, cursor?: 'from' | 'to' | 'head' | 'anchor' }
const nudgeDefaults = { ch: 0, ln: 0, cursor: 'from' } as const
export function nudgeCursor(editor: EnhancedEditor, opts: nudgeOpts = nudgeDefaults ) {
	const opts2 = Object.assign(nudgeDefaults, opts)
	const prevPos = editor.getCursor('to')
	prevPos.ch += opts2.ch
	prevPos.line += opts2.ch
	editor.setCursor(prevPos)
}

export function isURL(str: string) {
  try {
    const url = new URL(str);
  } catch (_) {
    return false;  
  }
  return true;
}