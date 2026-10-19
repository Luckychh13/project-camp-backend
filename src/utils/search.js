import { ApiError } from "./api-error.js";

const MAX_SEARCH_LENGTH = 100;

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getSearchRegex = (value) => {
    if (value === undefined) {
        return null;
    }

    if (typeof value !== "string") {
        throw new ApiError(400, "Search must be a string");
    }

    if (value.length > MAX_SEARCH_LENGTH) {
        throw new ApiError(
            400,
            `Search must not exceed ${MAX_SEARCH_LENGTH} characters`
        );
    }

    const searchTerm = value.trim();

    if (!searchTerm) {
        return null;
    }

    return new RegExp(escapeRegex(searchTerm), "i");
};