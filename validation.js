import dotenv from "dotenv";

dotenv.config();

export {
    validateUsername,
    validateName,
    validateEmail,
    validatePassword,
    validatePostcode,
}

let POSTCODE_OUTWARD_FORMAT_1 = "^[A-Z][A-Z]\\d"       // AA9 9AA
let POSTCODE_OUTWARD_FORMAT_2 = "^[A-Z][A-Z]\\d\\d"     // AA99 9AA
let POSTCODE_OUTWARD_FORMAT_3 = "^[A-Z]\\d"     // A9 9AA
let POSTCODE_OUTWARD_FORMAT_4 = "^[A-Z]\\d\\d"       // A99 9AA
let POSTCODE_OUTWARD_FORMAT_5 = "^[A-Z]\\d[A-Z]"       // A9A 9AA
let POSTCODE_OUTWARD_FORMAT_6 = "^[A-Z][A-Z]\\d[A-Z]"       // AA9A 9AA
let POSTCODE_INWARD_FORMAT = "\\d[A-Z][A-Z]$"


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
    let formats = [
        POSTCODE_OUTWARD_FORMAT_1,
        POSTCODE_OUTWARD_FORMAT_2,
        POSTCODE_OUTWARD_FORMAT_3,
        POSTCODE_OUTWARD_FORMAT_4,
        POSTCODE_OUTWARD_FORMAT_5,
        POSTCODE_OUTWARD_FORMAT_6
    ]

    for (let format of formats) {
        let regex = new RegExp(format + "(\\s)*" + POSTCODE_INWARD_FORMAT)

        let isMatch = regex.test(postcode);

        if (isMatch) {
            return true
        }
    }

    return false
}

function validateEventStartDate(date) {
    let now = new Date()

    return date >= now
}

function validateEventEndDate(date) {}