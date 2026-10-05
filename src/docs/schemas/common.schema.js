export const commonSchemas = {
    ErrorResponse: {
        success: false,
        message: "Something went wrong",
        errors: []
    },

    ValidationErrorResponse: {
        success: false,
        message: "Recieved data is not valid",
        errors: [
            {
                status: "Field validation error"
            }
        ]
    }
};