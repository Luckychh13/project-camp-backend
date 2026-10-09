import { errorHandler } from "../src/middlewares/error.middlewares.js"
import { jest } from "@jest/globals"

const createMocks = () => {
    const req = {
        id: "test-request-id",
        method: "GET"
    }

    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    }

    const next = jest.fn()

    return { req, res, next }
}

describe("Central Error Handler", () => {
    test("should handle CastError with status 400", () => {
        const { req, res, next } = createMocks()

        const error = new Error("Internal cast details")
        error.name = "CastError"
        error.path = "_id"

        errorHandler(error, req, res, next)

        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Invalid value for "_id"',
            errors: []
        })
    })

    test("should handle Mongoose ValidationError with status 422", () => {
        const { req, res, next } = createMocks()

        const error = new Error("Task validation failed")
        error.name = "ValidationError"
        error.errors = {
            title: {
                path: "title",
                message: "Title is required"
            },
            description: {
                path: "description",
                message: "Description is too long"
            }
        }

        errorHandler(error, req, res, next)

        expect(res.status).toHaveBeenCalledWith(422)
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Validation failed",
            errors: [
                { title: "Title is required" },
                { description: "Description is too long" }
            ]
        })
    })

    test("should handle duplicate-key error with status 409", () => {
        const { req, res, next } = createMocks()

        const error = new Error("Duplicate key details")
        error.code = 11000
        error.keyPattern = { email: 1 }
        error.keyValue = { email: "private@example.com" }

        errorHandler(error, req, res, next)

        expect(res.status).toHaveBeenCalledWith(409)
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "A record with this value already exists",
            errors: [
                { email: "This value already exists" }
            ]
        })

        expect(JSON.stringify(res.json.mock.calls[0][0]))
            .not.toContain("private@example.com")
    })

    test("should return a safe response for unexpected server errors", () => {
        const { req, res, next } = createMocks()

        const error = new Error(
            "Internal database connection details"
        )

        errorHandler(error, req, res, next)

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Something went wrong",
            errors: []
        })

        expect(JSON.stringify(res.json.mock.calls[0][0]))
            .not.toContain("Internal database connection details")
    })
})