import { getSearchRegex } from "../src/utils/search.js";

describe("getSearchRegex", () => {
    test("should return null when search is not provided", () => {
        expect(getSearchRegex(undefined)).toBeNull();
    });

    test("should trim whitespace and match case-insensitively", () => {
        const regex = getSearchRegex("  Login  ");

        expect(regex.test("Build login API")).toBe(true);
        expect(regex.test("Build LOGIn API")).toBe(true);
        expect(regex.test("Build database API")).toBe(false);
    });

    test("should treat regex special characters literally", () => {
        const regex = getSearchRegex("login.*");

        expect(regex.test("login.*")).toBe(true);
        expect(regex.test("login anything")).toBe(false);
    });

    test("should reject non-string search values", () => {
        expect(() => getSearchRegex(["login"])).toThrow(
            "Search must be a string"
        );
    });

    test("should reject search terms longer than 100 characters", () => {
        expect(() => getSearchRegex("a".repeat(101))).toThrow(
            "Search must not exceed 100 characters"
        );
    });

    test("should return null for an empty search term", () => {
        expect(getSearchRegex("   ")).toBeNull();
    });
});