import { getPaginationOptions } from "../src/utils/pagination.js";
import { ApiError } from "../src/utils/api-error.js";

describe("getPaginationOptions", () => {
    test("uses default values when no query parameters are provided", () => {
        expect(getPaginationOptions({})).toEqual({
            page: 1,
            limit: 10,
            skip: 0,
        });
    });

    test("calculates skip correctly", () => {
        expect(
            getPaginationOptions({ page: "3", limit: "10" })
        ).toEqual({
            page: 3,
            limit: 10,
            skip: 20,
        });
    });

    test("allows the maximum limit of 100", () => {
        expect(
            getPaginationOptions({ page: "1", limit: "100" })
        ).toEqual({
            page: 1,
            limit: 100,
            skip: 0,
        });
    });

    test.each([
        ["0", "zero"],
        ["-1", "negative"],
        ["1.5", "decimal"],
        ["abc", "non-numeric"],
        ["9007199254740992", "unsafe integer"],
    ])("rejects a %s page (%s)", (page) => {
        expect(() =>
            getPaginationOptions({ page })
        ).toThrow(ApiError);
    });

    test("rejects an array instead of a page string", () => {
        expect(() =>
            getPaginationOptions({ page: ["1", "2"] })
        ).toThrow(ApiError);
    });

    test("rejects a limit greater than 100", () => {
        expect(() =>
            getPaginationOptions({ limit: "101" })
        ).toThrow(ApiError);
    });

    test("rejects an excessively deep page", () => {
        expect(() =>
            getPaginationOptions({ page: "10002", limit: "10" })
        ).toThrow(ApiError);
    });
});