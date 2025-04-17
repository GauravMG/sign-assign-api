export function areArraysEqual(arr1, arr2) {
	// Step 1: Check if lengths are equal
	if (arr1.length !== arr2.length) return false

	// Step 2: Sort both arrays
	const sortedArr1 = [...arr1].sort()
	const sortedArr2 = [...arr2].sort()

	// Step 3: Compare elements
	return sortedArr1.every((value, index) => value === sortedArr2[index])
}
