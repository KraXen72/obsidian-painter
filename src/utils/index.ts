export function numToHexSuffix(num: number) {
	const repr = num.toString(16)
	if (repr.length === 1) return '0' + repr;
	return repr;
}