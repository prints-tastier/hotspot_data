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

    if (!isBearerToken) { return null }

    console.log(authorization.split(" ")[1])
}

getBearerToken("Bearer abc")