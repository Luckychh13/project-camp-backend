import { getSortOptions } from "../src/utils/sorting.js";

const allowedFields = [
    "title",
    "status",
    "createdAt",
    "updatedAt",
];

describe("getSortOptions", () => {
    test("should use the default sort when no options are provided", () => {
        expect(getSortOptions({}, allowedFields)).toEqual({
            createdAt: -1,
            _id: -1,
        });
    });

    test("should sort by title in ascending order", () => {
        expect(
            getSortOptions(
                { sortBy: "title", order: "asc" },
                allowedFields
            )
        ).toEqual({
            title: 1,
            _id: 1,
        });
    });

    test("should sort by status in descending order", () => {
        expect(
            getSortOptions(
                { sortBy: "status", order: "desc" },
                allowedFields
            )
        ).toEqual({
            status: -1,
            _id: -1,
        });
    });

    test("should reject unsupported sort fields", () => {
        expect(() =>
            getSortOptions(
                { sortBy: "password", order: "desc" },
                allowedFields
            )
        ).toThrow("Invalid sort field");
    });

    test("should reject invalid sort directions", () => {
        expect(() =>
            getSortOptions(
                { sortBy: "title", order: "sideways" },
                allowedFields
            )
        ).toThrow("Invalid sort order");
    });

    test("should reject non-string sort parameters", () => {
        expect(() =>
            getSortOptions(
                { sortBy: ["title"], order: "asc" },
                allowedFields
            )
        ).toThrow("Invalid sort field");
    });
});