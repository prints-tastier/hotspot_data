export {
    Sanitized
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

function ValidatePartialModel(schema, body, exclude = []) {}
