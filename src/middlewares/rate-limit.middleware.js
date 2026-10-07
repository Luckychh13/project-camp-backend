import { rateLimit } from "express-rate-limit"

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: {
        success: false,
        message: "Too many requests, please try again later",
        errors: []
    }
})

export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: {
        success: false,
        message: "Too many requests, please try again later",
        errors: []
    }
})