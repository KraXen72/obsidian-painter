export function numToHexSuffix(num: number) {
	const repr = num.toString(16)
	if (repr.length === 1) return '0' + repr;
	return repr;
}

export const sample = (arr: unknown[]) => arr[Math.floor(Math.random() * arr.length)];