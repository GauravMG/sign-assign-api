import isJSON from "is-json"

// single quote double qoute case
export async function stringCaseSkipping(dataString: string) {
	//  return dataString
	if (dataString.includes("'")) {
		const stringArr = dataString.split("'")
		const stringFormat = stringArr.map((el) =>
			el.indexOf("'") ? el.replace(/'/g, "''") : el
		)
		return stringFormat.join("''")
	} else if (dataString.includes('"')) {
		const stringArr = dataString.split('"')
		const stringFormat = stringArr.map((el) =>
			el.indexOf('"') ? el.replace(/"/g, '"') : el
		)
		return stringFormat.join('"')
	}
	return dataString
}

export async function escapeJSONString(inputData: any) {
	// inputData = JSON.parse(inputData)

	// start treating json
	if (inputData) {
		if (typeof inputData === "object" && Array.isArray(inputData)) {
			const newData: any[] = []

			for (let el of inputData) {
				newData.push(await escapeJSONString(el))
			}

			inputData = newData
		} else if (typeof inputData === "object" && !Array.isArray(inputData)) {
			const objectKeys = Object.keys(inputData)

			for (let objectKey of objectKeys) {
				inputData[objectKey] = await escapeJSONString(inputData[objectKey])
			}
		} else if (typeof inputData === "string" && isJSON(inputData)) {
			const newObject = JSON.parse(inputData)

			const objectKeys = Object.keys(newObject)

			for (let objectKey of objectKeys) {
				newObject[objectKey] = await escapeJSONString(newObject[objectKey])
			}

			inputData = JSON.stringify(newObject)
		} else if (typeof inputData === "string" && !isJSON(inputData)) {
			inputData = await stringCaseSkipping(inputData)
		} else {
			return inputData
		}
	}

	// end treating json

	// return JSON.stringify(inputData)
	return inputData
}
