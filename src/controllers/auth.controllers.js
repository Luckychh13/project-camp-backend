import { User } from "../models/user.models.js"
import { ApiResponse } from "../utils/api-response.js"
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail } from "../utils/mail.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Register a new user'

        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: '#/components/schemas/RegisterRequest'
                    }
                }
            }
        }

        #swagger.responses[201] = {
            description: 'User registered successfully',
            schema: {
                $ref: '#/components/schemas/RegisterResponse'
            }
        }

        #swagger.responses[409] = {
            description: 'User with username or email already exists',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[422] = {
            description: 'Validation failed',
            schema: {
                $ref: '#/components/schemas/ValidationErrorResponse'
            }
        }

        #swagger.responses[500] = {
            description: 'Internal server error while registering user',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }


        #swagger.responses[429] = {
            description: 'Too many requests',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { email, username, password, fullName } = req.body

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with usename or email alredy exists", [])
    }

    const user = await User.create({
        email,
        password,
        username,
        isEmailVerified: false
    })

    const { unHashedToken, hashedToken, TokenExpiry } =
        user.generateTemporaryToken()

    user.emailVerificationToken = hashedToken
    user.emailVerificationExpire = TokenExpiry

    await user.save({ validateBeforeSave: false })

    await sendEmail({
        email: user?.email,
        subject: "Please verify ur email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}:${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
        ),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpire"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { user: createdUser },
                "User registered successfully and verification email has been sent to ur email"
            )
        )

})

const login = asyncHandler(async (req, res) => {

    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Login a user'

        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: '#/components/schemas/LoginRequest'
                    }
                }
            }
        }

        #swagger.responses[200] = {
            description: 'User logged in successfully',
            schema: {
                $ref: '#/components/schemas/LoginResponse'
            },
            headers: {
                'Set-Cookie': {
                    description: 'HTTP-only access and refresh token cookies',
                    schema: {
                        type: 'string'
                    }
                }
            }
        }

        #swagger.responses[400] = {
            description: 'User does not exist or email/password is invalid',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[422] = {
            description: 'Validation failed',
            schema: {
                $ref: '#/components/schemas/ValidationErrorResponse'
            }
        }

        #swagger.responses[500] = {
            description: 'Internal server error while generating tokens',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }


        #swagger.responses[429] = {
            description: 'Too many requests',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(400, "User does not exists")
    }

    const isPasswordValid = await user.isPasswoerdCrrt(password)

    if (!isPasswordValid) {
        throw new ApiError(400, "Email or Password is Invalid")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpire"
    )

    const accessTokenCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }

    const refreshTokenCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 24 * 60 * 60 * 1000
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Logout a user'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.responses[200] = {
            description: 'User logged out successfully',
            schema: {
                $ref: '#/components/schemas/LogoutResponse'
            },
            headers: {
                'Set-Cookie': {
                    description: 'Clears the accessToken and refreshToken cookies',
                    schema: {
                        type: 'string'
                    }
                }
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true
        },
    );
    const Options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
    return res
        .status(200)
        .clearCookie("accessToken", Options)
        .clearCookie("refreshToken", Options)
        .json(
            new ApiResponse(200, {}, "User logged out")
        )
})

const getCurrentUser = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Get current user'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Current user fetched successfully',
        schema: {
            $ref: '#/components/schemas/CurrentUserResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }
*/    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched Successfully"))
})

const verifyEmail = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Verify user email'

        #swagger.responses[200] = {
            description: 'Email verified successfully',
            schema: {
                $ref: '#/components/schemas/VerifyEmailResponse'
            }
        }

        #swagger.responses[400] = {
            description: 'Verification token is missing, invalid, or expired',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { verificationToken } = req.params

    if (!verificationToken) {
        throw new ApiError(400, "Email verification token is missing")
    }

    let hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex")

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpire: { $gt: Date.now() }
    })
    if (!user) {
        throw new ApiError(400, "Token is invalid or expired")
    }

    user.emailVerificationToken = undefined
    user.emailVerificationExpire = undefined

    user.isEmailVerified = true
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    isEmailVerified: true
                },
                "Email is Verified"
            )
        )
})

const resendEmailVerification = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Resend email verification'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.responses[200] = {
            description: 'Verification email sent successfully',
            schema: {
                $ref: '#/components/schemas/ResendEmailVerificationResponse'
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[404] = {
            description: 'User does not exist',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[409] = {
            description: 'Email is already verified',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    if (user.isEmailVerified) {
        throw new ApiError(409, "Email is already Verified");
    }

    const { unHashedToken, hashedToken, TokenExpiry } =
        user.generateTemporaryToken()


    user.emailVerificationToken = hashedToken
    user.emailVerificationExpire = TokenExpiry

    await user.save({ validateBeforeSave: false })

    await sendEmail({
        email: user?.email,
        subject: "Please verify ur email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}:${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
        ),
    })
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Mail has been sent to your email Id"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Refresh access token'

        #swagger.responses[200] = {
            description: 'Access token refreshed',
            schema: {
                $ref: '#/components/schemas/RefreshTokenResponse'
            },
            headers: {
                'Set-Cookie': {
                    description: 'HTTP-only access and refresh token cookies',
                    schema: {
                        type: 'string'
                    }
                }
            }
        }

        #swagger.responses[401] = {
            description: 'Invalid refresh token',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }


        #swagger.responses[429] = {
            description: 'Too many requests',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Invalid refresh token")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh token")
        }

        const accessTokenCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        }

        const refreshTokenCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 10 * 24 * 60 * 60 * 1000
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id)



        return res
            .status(200)
            .cookie("accessToken", accessToken, accessTokenCookieOptions)
            .cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token")
    }
})

const forgotPassword = asyncHandler(async (req, res) => {
    /*
       #swagger.tags = ['Auth']
       #swagger.summary = 'Request password reset'

       #swagger.requestBody = {
           required: true,
           content: {
               "application/json": {
                   schema: {
                       $ref: '#/components/schemas/ForgotPasswordRequest'
                   }
               }
           }
       }

       #swagger.responses[200] = {
           description: 'Password reset email sent',
           schema: {
               $ref: '#/components/schemas/ForgotPasswordResponse'
           }
       }

       #swagger.responses[404] = {
           description: 'User does not exist',
           schema: {
               $ref: '#/components/schemas/ErrorResponse'
           }
       }

       #swagger.responses[422] = {
           description: 'Validation failed',
           schema: {
               $ref: '#/components/schemas/ValidationErrorResponse'
           }
       }

       #swagger.responses[429] = {
           description: 'Too many requests',
           schema: {
               $ref: '#/components/schemas/ErrorResponse'
           }
       }
   */
    const { email } = req.body;

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const { unHashedToken, hashedToken, TokenExpiry } = user.generateTemporaryToken()

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpire = TokenExpiry;

    await user.save({ validateBeforeSave: false })

    await sendEmail({
        email: user?.email,
        subject: "Password reset request",
        mailgenContent: forgotPasswordMailgenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`
        ),
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password resend mail has been send to ur mail "
            )
        )

})

const resetForgotPassword = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Reset password using token'

    #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: '#/components/schemas/ResetPasswordRequest'
                }
            }
        }
    }

    #swagger.responses[200] = {
        description: 'Password reset successfully',
        schema: {
            $ref: '#/components/schemas/ResetPasswordResponse'
        }
    }

    #swagger.responses[400] = {
        description: 'Reset token is invalid or expired',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[422] = {
        description: 'Validation failed',
        schema: {
            $ref: '#/components/schemas/ValidationErrorResponse'
        }
    }
*/    const { resetToken } = req.params
    const { newPassword } = req.body

    let hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex")

    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpire: { $gt: Date.now() }
    })

    if (!user) {
        throw new ApiError(400, "Token is invalid or expired")
    }

    user.forgotPasswordExpire = undefined
    user.forgotPasswordToken = undefined

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset successfully"
            )
        )

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    /*
       #swagger.tags = ['Auth']
       #swagger.summary = 'Change current password'
       #swagger.security = [{ "bearerAuth": [] }]

       #swagger.requestBody = {
           required: true,
           content: {
               "application/json": {
                   schema: {
                       $ref: '#/components/schemas/ChangePasswordRequest'
                   }
               }
           }
       }

       #swagger.responses[200] = {
           description: 'Password changed successfully',
           schema: {
               $ref: '#/components/schemas/ChangePasswordResponse'
           }
       }

       #swagger.responses[400] = {
           description: 'Old password is invalid',
           schema: {
               $ref: '#/components/schemas/ErrorResponse'
           }
       }

       #swagger.responses[401] = {
           description: 'Unauthorized',
           schema: {
               $ref: '#/components/schemas/ErrorResponse'
           }
       }

       #swagger.responses[422] = {
           description: 'Validation failed',
           schema: {
               $ref: '#/components/schemas/ValidationErrorResponse'
           }
       }
   */
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswoerdCrrt(oldPassword)

    if (!isPasswordValid) {
        throw new ApiError(400, "Inavlid old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully"
            )
        )
})



export {
    registerUser,
    login,
    logoutUser,
    getCurrentUser,
    verifyEmail,
    resendEmailVerification,
    refreshAccessToken,
    forgotPassword,
    resetForgotPassword,
    changeCurrentPassword
}


