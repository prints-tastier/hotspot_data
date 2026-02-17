import {ErrorCode} from "./codes.js";

export {
    Sanitized, ResolveSchemaValidationErrors
}

function Sanitized(schema, body, exclude = []) {

    let schemaFields = Object.keys(schema.obj)
    let bodyFields = Object.keys(body)

    console.log("[Sanitized]", schemaFields, bodyFields, exclude)
    let sanitized = {}

    for (let field of bodyFields) {
        if (schemaFields.includes(field) && !exclude.includes(field)) {
            sanitized[field] = body[field]
        }
    }

    return sanitized
}

function ResolveSchemaValidationErrors(validationError) {
    let errorMessages = []
    let errorObjects = []

    let errors = validationError.errors
    let fields = Object.keys(errors)

    errors = fields.map(it => errors[it])

    for (let error of errors) {
        if (error.name === "ValidatorError") {
            console.log("ERROR", error)
            let code = error.kind === "required" ? ErrorCode.MISSING_FIELD : ErrorCode.INVALID_FIELD

            let errorObject = {
                code,
                field: error.path,
                message: error.message
            }

            errorMessages.push(error.message)
            errorObjects.push(errorObject)
        }
    }
    console.log(JSON.stringify(errorMessages, null, 2))
    errorMessages = [...new Set(errorMessages)]
    let errorMessage = errorMessages.join(" ")

    return {errors: errorObjects, errorMessage}
}

function ValidatePartialModel(schema, body, exclude = []) {}
