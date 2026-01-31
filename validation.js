import dotenv from "dotenv";

dotenv.config();

export {
    validateUsername,
    validateName,
    validateEmail,
    validatePassword,
    validatePostcode,
}


// TODO write tests
function validateUsername(username) {
    let usernameRegex = new RegExp(process.env.USERNAME_REGEX);

    let lengthValid = username.length >= process.env.USERNAME_MIN_LENGTH &&
        username.length <= process.env.USERNAME_MAX_LENGTH;

    let formatValid = usernameRegex.test(username);

    return lengthValid && formatValid;
}

function validateName(username) {
    let lengthValid = username.length <= process.env.NAME_MAX_LENGTH;

    return lengthValid
}

function validateEmail(email) {
    return true // TODO implement
}

function validatePassword(password) {
    let chars = [...password]

    let hasLower = chars.some(char => char === char.toLowerCase());
    let hasUpper = chars.some(char => char === char.toUpperCase());
    let hasDigit = chars.some(char => /\d/.test(char));
    let hasSpecialCharacter = chars.some(char => /[^a-zA-Z0-9]/.test(char));

    return hasLower && hasUpper && hasDigit && hasSpecialCharacter;
}

function validatePostcode(postcode) {
    let format1 = /^[A-Z][A-Z]\d \d[A-Z][A-Z]$/       // AA9 9AA
    let format2 = /^[A-Z][A-Z]\d\d \d[A-Z][A-Z]$/     // AA99 9AA
    let format3 = /^[A-Z]\d \d[A-Z][A-Z]$/       // A9 9AA
    let format4 = /^[A-Z]\d\d \d[A-Z][A-Z]$/       // A99 9AA
    let format5 = /^[A-Z]\d[A-Z] \d[A-Z][A-Z]$/       // A9A 9AA
    let format6 = /^[A-Z][A-Z]\d[A-Z] \d[A-Z][A-Z]$/       // AA9A 9AA

    let isMatch = format1.test(postcode) ||
        format2.test(postcode) ||
        format3.test(postcode) ||
        format4.test(postcode) ||
        format5.test(postcode) ||
        format6.test(postcode)

    return isMatch
}