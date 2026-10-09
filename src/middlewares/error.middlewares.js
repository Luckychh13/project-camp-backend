import { logger } from "../utils/logger.js"

const errorHandler = (err, req, res, next) => {
    const hasValidStatusCode =
        Number.isInteger(err.statusCode) &&
        err.statusCode >= 400 &&
        err.statusCode <= 599

    const isCastError = err.name === "CastError"
    const isValidationError = err.name === "ValidationError"
    const isDuplicateKeyError = err.code === 11000

    const statusCode = hasValidStatusCode
        ? err.statusCode
        : isCastError
            ? 400
            : isValidationError
                ? 422
                : isDuplicateKeyError
                    ? 409
                    : 500

    const isServerError = statusCode >= 500

    if (isServerError) {
        logger.error(
            {
                err,
                requestId: req.id,
                method: req.method,
                statusCode
            },
            "Unhandled server error"
        )
    }

    let message

    if (isServerError) {
        message = "Something went wrong"
    } else if (isCastError) {
        message = err.path
            ? `Invalid value for "${err.path}"`
            : "Invalid value provided"
    } else if (isValidationError) {
        message = "Validation failed"
    } else if (isDuplicateKeyError) {
        message = "A record with this value already exists"
    } else {
        message = err.message || "Something went wrong"
    }

    let errors

    if (isServerError || isCastError) {
        errors = []
    } else if (isValidationError) {
        errors = Object.values(err.errors || {}).map(
            ({ path, message }) => ({
                [path || "field"]: message || "Invalid value"
            })
        )
    } else if (isDuplicateKeyError) {
        const duplicateFields = Object.keys(
            err.keyPattern || err.keyValue || {}
        )

        errors = duplicateFields.length === 1
            ? [{
                [duplicateFields[0]]: "This value already exists"
            }]
            : []
    } else {
        errors = err.errors || []
    }

    return res.status(statusCode).json({
        success: false,
        message,
        errors
    })
}

export { errorHandler }