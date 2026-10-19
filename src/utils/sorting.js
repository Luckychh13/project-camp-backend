import { ApiError } from "./api-error.js";

const DEFAULT_SORT_BY = "createdAt"
const DEFAULT_ORDER = "desc"

export const getSortOptions = (query, allowedFields) => {

    const sortBy = query.sortBy ?? DEFAULT_SORT_BY
    const order = query.order ?? DEFAULT_ORDER
    if (
        typeof sortBy !== "string" ||
        !allowedFields.includes(sortBy)
    ) {
        throw new ApiError(400, "Invalid sort field");
    }

    if (
        typeof order !== "string" ||
        !["asc", "desc"].includes(order)
    ) {
        throw new ApiError(400, "Invalid sort order");
    }

    const direction = order === "asc" ? 1 : -1;

    return {
        [sortBy]: direction,
        _id: direction,
    };
};