import request, { agent } from "supertest"
import app from "../src/app.js"
import mongoose from "mongoose";
import "dotenv/config";
import { User } from "../src/models/user.models.js";

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

    test("should reject registration when email already exists", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: process.env.REGISTERED_EMAIL,
                username: `newuser${Date.now()}`,
                password: "password123"
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(
            "User with usename or email alredy exists"
        );
    });

    test("should reject registration when username already exists", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: `newemail${Date.now()}@gmail.com`,
                username: process.env.REGISTERED_USERNAME,
                password: "password123"
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(
            "User with usename or email alredy exists"
        );
    });

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

    //current-user test
    test("should reject current user request without authentication", async () => {
        const response = await request(app)
            .get("/api/v1/auth/current-user")

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe("Unauthorized request")
    })

    test("should get current user when authenticated", async () => {
        const agent = request.agent(app)

        await agent
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: process.env.REGISTERED_PASSWORD
            })
        const response = await agent
            .get("/api/v1/auth/current-user")

        expect(response.statusCode).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe("Current user fetched Successfully")

        expect(response.body.data).toBeDefined()
        expect(response.body.data.email).toBe(
            process.env.REGISTERED_EMAIL
        )
    })

    test("should reject current user request with invalid token", async () => {
        const response = await request(app)
            .get("/api/v1/auth/current-user")
            .set("Authorization", "Bearer invalid-token");

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid access token");
    });

    //logout test
    test("should logout successfully", async () => {
        const agent = request.agent(app)

        await agent
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: process.env.REGISTERED_PASSWORD
            })

        const response = await agent
            .post("/api/v1/auth/logout")

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("USer logged out");

        expect(response.body.data).toEqual({});

        const currentUserResponse = await agent
            .get("/api/v1/auth/current-user");

        expect(currentUserResponse.statusCode).toBe(401);
        expect(currentUserResponse.body.success).toBe(false);
        expect(currentUserResponse.body.message).toBe("Unauthorized request");
    })

    //refreshtoken test
    test("should reject refresh token request without refresh token", async () => {
        const response = await request(app)
            .post("/api/v1/auth/refresh-token");

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid refresh token");
    });

    test("should refresh access token successfully", async () => {
        const agent = request.agent(app)

        await agent
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: process.env.REGISTERED_PASSWORD
            })

        const response = await agent
            .post("/api/v1/auth/refresh-token")

        expect(response.statusCode).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe('Access token refreshed')
    })

    test("should reject invalid refresh token", async () => {
        const response = await request(app)
            .post("/api/v1/auth/refresh-token")
            .set("Cookie", ["refreshToken=jfbskfjbkj"]);

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid refresh token");
    });

    test("should reject old refresh token after token refresh", async () => {
        const agent = request.agent(app);

        const loginResponse = await agent
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: process.env.REGISTERED_PASSWORD
            });

        const oldRefreshCookie = loginResponse.headers["set-cookie"]
            .find(cookie => cookie.startsWith("refreshToken="));

        const refreshResponse = await agent
            .post("/api/v1/auth/refresh-token");

        expect(refreshResponse.statusCode).toBe(200);

        const response = await request(app)
            .post("/api/v1/auth/refresh-token")
            .set("Cookie", oldRefreshCookie);

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid refresh token");
    });

    //forgotPassword test
    test("should reject forgot password request with empty data", async () => {
        const response = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({});

        expect(response.statusCode).toBe(422);
        expect(response.body.success).toBe(false);

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    email: "Email is required"
                })
            ])
        );
    });

    test("should reject forgot password request with invalid email", async () => {
        const response = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({
                email: "Jhon@"
            });

        expect(response.statusCode).toBe(422);
        expect(response.body.success).toBe(false);

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    email: "Email is invalid"
                })
            ])
        );
    });

    test("should reject forgot password request when user does not exist", async () => {
        const response = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({
                email: "nonexistent@gmail.com"
            });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("User does not exist");
    });

    //resetPassword
    test("should reject reset password request without new password", async () => {
        const response = await request(app)
            .post("/api/v1/auth/reset-password/some-reset-token")
            .send({});

        expect(response.statusCode).toBe(422);
        expect(response.body.success).toBe(false);

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    newPassword: "Password is required"
                })
            ])
        );
    });

    test("should reject reset password request with invalid reset token", async () => {
        const response = await request(app)
            .post("/api/v1/auth/reset-password/invalid-reset-token")
            .send({
                newPassword: "newpassword123"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Token is invalid or expired");
    });

    test("should reset password successfully with valid reset token", async () => {
        const user = await User.create({
            username: `resetuser${Date.now()}`,
            email: `reset${Date.now()}@gmail.com`,
            password: "oldpassword123"
        });

        const {
            unHashedToken,
            hashedToken,
            TokenExpiry
        } = user.generateTemporaryToken();

        user.forgotPasswordToken = hashedToken;
        user.forgotPasswordExpire = TokenExpiry;

        await user.save({ validateBeforeSave: false });

        const response = await request(app)
            .post(`/api/v1/auth/reset-password/${unHashedToken}`)
            .send({
                newPassword: "newpassword123"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Password rest successfully");

        const updatedUser = await User.findById(user._id);

        expect(
            await updatedUser.isPasswoerdCrrt("newpassword123")
        ).toBe(true);

        await User.findByIdAndDelete(user._id);
    });

    //changePassword
    test("should reject change password request with empty data", async () => {
        const agent = request.agent(app);

        await agent
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: process.env.REGISTERED_PASSWORD
            });

        const response = await agent
            .post("/api/v1/auth/change-password")
            .send({});

        expect(response.statusCode).toBe(422);
        expect(response.body.success).toBe(false);

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    oldPassword: "Old password is required"
                }),
                expect.objectContaining({
                    newPassword: "New Password is required"
                })
            ])
        );
    });

    test("should reject change password request with incorrect old password", async () => {
        const agent = request.agent(app);

        await agent
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: process.env.REGISTERED_PASSWORD
            });

        const response = await agent
            .post("/api/v1/auth/change-password")
            .send({
                oldPassword: "wrong-old-password",
                newPassword: "newpassword123"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Inavlid old Password");
    });

    test("should change password successfully", async () => {
        const oldPassword = "oldpassword123";
        const newPassword = "newpassword123";

        const user = await User.create({
            username: `passwordtest${Date.now()}`,
            email: `passwordtest${Date.now()}@gmail.com`,
            password: oldPassword
        });

        const agent = request.agent(app);

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: user.email,
                    password: oldPassword
                });

            const response = await agent
                .post("/api/v1/auth/change-password")
                .send({
                    oldPassword,
                    newPassword
                });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Password changed successfully"
            );

            const updatedUser = await User.findById(user._id);

            expect(
                await updatedUser.isPasswoerdCrrt(newPassword)
            ).toBe(true);
        } finally {
            await User.findByIdAndDelete(user._id);
        }
    });

    //verifyEmail test
    test("should reject email verification with invalid token", async () => {
        const response = await request(app)
            .get("/api/v1/auth/verify-email/invalid-token");

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Token is invalid or expired");
    });

    test("should verify email successfully", async () => {
        const user = await User.create({
            username: `verifyuser${Date.now()}`,
            email: `verify${Date.now()}@gmail.com`,
            password: "password123"
        });

        const {
            unHashedToken,
            hashedToken,
            TokenExpiry
        } = user.generateTemporaryToken();

        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpire = TokenExpiry;

        await user.save({ validateBeforeSave: false });

        const response = await request(app)
            .get(`/api/v1/auth/verify-email/${unHashedToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Email is Verified");
        expect(response.body.data.isEmailVerified).toBe(true);

        const updatedUser = await User.findById(user._id);

        expect(updatedUser.isEmailVerified).toBe(true);
        expect(updatedUser.emailVerificationToken).toBeUndefined();
        expect(updatedUser.emailVerificationExpire).toBeUndefined();

        await User.findByIdAndDelete(user._id);
    });

    test("should reject resend email verification without authentication", async () => {
        const response = await request(app)
            .post("/api/v1/auth/resend-email-verification");

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Unauthorized request");
    });

    test("should reject resend email verification for verified user", async () => {
        const user = await User.create({
            username: `verifieduser${Date.now()}`,
            email: `verified${Date.now()}@gmail.com`,
            password: "password123",
            isEmailVerified: true
        });

        const agent = request.agent(app);

        await agent
            .post("/api/v1/auth/login")
            .send({
                email: user.email,
                password: "password123"
            });

        const response = await agent
            .post("/api/v1/auth/resend-email-verification");

        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(
            "Email is already Verified"
        );

        await User.findByIdAndDelete(user._id);
    });
})