export function numToHexSuffix(num: number) {
	const repr = num.toString(16)
	if (repr.length === 1) return '0' + repr;
	return repr;
}

export function hexSuffixToNum(hex: string) {
	return parseInt(hex, 16)
}

export const sample = (arr: unknown[]) => arr[Math.floor(Math.random() * arr.length)];

export function isURL(str: string) {
  try {
    let url = new URL(str);
  } catch (_) {
    return false;  
  }
  return true;
}