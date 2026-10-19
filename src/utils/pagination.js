import { ApiError } from './api-error.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_SKIP = 100_000;

const parsePositiveInteger = (value, name, defaultValue) => {
    if (value === undefined) {
        return defaultValue
    }

    if (typeof value !== "string" || !/^\d+$/.test(value)) {
        throw new ApiError(400, `${name} must be a positive integer`);
    }

    const parsedValue = Number(value)

    if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
        throw new ApiError(400, `${name} must be a positive integer`)
    }
    
    return parsedValue
}

export const getPaginationOptions = (query) => {

    const page = parsePositiveInteger(
        query.page,
        "page",
        DEFAULT_PAGE
    )

    const limit = parsePositiveInteger(
        query.limit,
        "limit",
        DEFAULT_LIMIT
    )

    if (limit > MAX_LIMIT) {
        throw new ApiError(400, `limit must not exceed ${MAX_LIMIT}`)
    }

    const skip = (page - 1) * limit

    if (!Number.isSafeInteger(skip) || skip > MAX_SKIP) {
        throw new ApiError(400, "Requested page is too deep")
    }

    return { page, limit, skip };
}