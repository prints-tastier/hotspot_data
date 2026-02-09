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

