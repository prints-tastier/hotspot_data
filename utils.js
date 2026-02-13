import {validatePostcode} from "./validation.js";

export {
    isLowerAlpha, isUpperAlpha, isAlpha, isNumeric, isAlphanumeric, hasSpecialCharacter,
    getBearerToken,
    hrefSelf
}

let POSTCODE_OUTWARD_FORMAT_1 = "^[A-Z][A-Z]\\d"       // AA9 9AA
let POSTCODE_OUTWARD_FORMAT_2 = "^[A-Z][A-Z]\\d\\d"     // AA99 9AA
let POSTCODE_OUTWARD_FORMAT_3 = "^[A-Z]\\d"     // A9 9AA
let POSTCODE_OUTWARD_FORMAT_4 = "^[A-Z]\\d\\d"       // A99 9AA
let POSTCODE_OUTWARD_FORMAT_5 = "^[A-Z]\\d[A-Z]"       // A9A 9AA
let POSTCODE_OUTWARD_FORMAT_6 = "^[A-Z][A-Z]\\d[A-Z]"       // AA9A 9AA
let POSTCODE_INWARD_FORMAT = "\\d[A-Z][A-Z]$"

function isLowerAlpha(str) {
    str.some(char => char === char.toLowerCase())
}

function isUpperAlpha(str) {
    str.some(char => char === char.toUpperCase())
}

function isAlpha(str) {
    return isLowerAlpha(str) || isUpperAlpha(str)
}

function isNumeric(str) {
    return str.some(char => /\d/.test(char))
}

function isAlphanumeric(str) {
    return isAlpha(str) || isNumeric(str)
}

function hasSpecialCharacter(str) {
    return !isAlphanumeric(str)
}

function getBearerToken(authorization) {
    let isBearerToken = authorization.startsWith("Bearer ")

    if (!isBearerToken) {
        return null
    }

    console.log(authorization.split(" ")[1])
}

function hrefSelf(endpoint, queryParams) {
    let params = Object.keys(queryParams)
    let queryKeyValuePairs = []

    for (let param of params) {
        let value = queryParams[param]

        if (value) {
            queryKeyValuePairs.push(`${param}=${encodeURIComponent(value)}`)
        }
    }

    let query = `?${queryKeyValuePairs.join("&")}`

    return `https://hotspot-data.onrender.com${endpoint}${query}`
}

function isPartialPostcode(postcode) {
    let format1 = "^[A-Z][A-Z]\d"       // AA9 9AA
    let format2 = "^[A-Z][A-Z]\d\d"     // AA99 9AA
    let format3 = "^[A-Z]\d"     // A9 9AA
    let format4 = "^[A-Z]\d\d"       // A99 9AA
    let format5 = "^[A-Z]\d[A-Z]"       // A9A 9AA
    let format6 = "^[A-Z][A-Z]\d[A-Z]"       // AA9A 9AA

    let end = "\d[A-Z][A-Z]$"

    let formats = [format1, format2, format3, format4, format5, format6]

    for (let format of formats) {
        let regex = new RegExp(format + end)

        let isMatch = regex.test(postcode);

        if (isMatch) {
            return true
        }
    }

    return false
}


function formatPostcode(postcode) {
    let isValid = validatePostcode(postcode)

    if (isValid) {
        let regex = new RegExp(POSTCODE_INWARD_FORMAT)
        let outward = postcode.replace(regex, "")
        outward = outward.trim()

        let inward = postcode.match(regex)[0]

        return `${outward} ${inward}`
    }

    return postcode
}