import request from "supertest"
import app from "../src/app.js"
import mongoose from "mongoose";
import "dotenv/config";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Auth API", () => {
    //register test
    test("should reject registration with empty data", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({})

        //Http response    
        expect(response.statusCode).toBe(422)

        //API's JSON response
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe("Recieved data is not valid")
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    email: "Email is required"
                }),
                expect.objectContaining({
                    username: "Username is required"
                }),
                expect.objectContaining({
                    password: "Password is required"
                }),
            ])
        )
    })

    test("should reject registration when email is missing", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Jhon",
                password: "12345678"
            })

        expect(response.statusCode).toBe(422)
        expect(response.body.success).toBe(false)

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    email: "Email is required"
                })
            ])
        )
    })

    test("should reject registration with invalid email", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Jhon",
                password: "12345678",
                email: "jhon@"
            })

        expect(response.statusCode).toBe(422)
        expect(response.body.success).toBe(false)

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    email: "Email is invalid"
                })
            ])
        )
    })

    //login test
    test("should reject login when password is missing", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "jhon@gmail.com",
            });

        expect(response.statusCode).toBe(422);
        expect(response.body.success).toBe(false);

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    password: "Password is required",
                }),
            ])
        );
    });

    test("should reject login with invalid email", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "jhon@",
                password: "12345678"
            });

        expect(response.statusCode).toBe(422);
        expect(response.body.success).toBe(false);

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    email: "Email is invalid",
                }),
            ])
        );
    });

    test("should reject login when user does not exists", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: 'jsleo@gmail.com',
                password: '123456778'
            })

        expect(response.statusCode).toBe(400)
        expect(response.body.message).toBe("User does not exists")
        expect(response.body.success).toBe(false)
    })

    test("should reject login with incorrect password", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: "1223c2455",
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Email or Password is Invalid");
    });

    test("should login user successfully", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: process.env.REGISTERED_PASSWORD
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("User logged in successfully");

        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.user.email).toBe(
            process.env.REGISTERED_EMAIL
        );

        const cookies = response.headers["set-cookie"];
        expect(cookies).toEqual(expect.any(Array));
        expect(
        cookies.some(cookie => cookie.startsWith("accessToken="))
    ).toBe(true);

    expect(
        cookies.some(cookie => cookie.startsWith("refreshToken="))
    ).toBe(true);
    });

})