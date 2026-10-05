export const authSchemas = {
    RegisterRequest: {
        $email: "jhon@example.com",
        $username: "jhon",
        $password: "anything@35361_+",
        fullName: "Jhon Show"
    },
    LoginRequest: {
        $email: "Jhon@example.com",
        $password: "anything@35361_+"
    },
    ForgotPasswordRequest: {
        $email: "Jhon@example.com"
    },
    ResetPasswordRequest: {
        $newPassword: "NewPassword@123"
    },
    ChangePasswordRequest: {
        $oldPassword: "OldPassword@123",
        $newPassword: "NewPassword@123"
    },
    User: {
        $_id: "65f1a2b3c4d5e6f789012345",
        $username: "lucky123",
        $email: "lucky@example.com",
        avatar: {
            url: "https://placehold.co/200x200",
            localPath: ""
        },
        fullName: "Lucky Chhabra",
        isEmailVerified: false,
        createdAt: "2026-10-02T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z"
    },
    RegisterResponse: {
        statusCode: 201,
        data: {
            user: {
                $ref: '#/components/schemas/User'
            }
        },
        message: "User registered successfully and verification email has been sent to ur email",
        success: true
    },
    LoginResponse: {
        statusCode: 200,
        data: {
            user: {
                $ref: '#/components/schemas/User'
            }
        },
        message: "User logged in successfully",
        success: true
    },
    VerifyEmailResponse: {
        statusCode: 200,
        data: {
            isEmailVerified: true
        },
        message: "Email is Verified",
        success: true
    },
    RefreshTokenResponse: {
        statusCode: 200,
        data: {},
        message: "Access token refreshed",
        success: true
    },
    ForgotPasswordResponse: {
        statusCode: 200,
        data: {},
        message: "Password resend mail has been send to ur mail ",
        success: true
    },
    ResetPasswordResponse: {
        statusCode: 200,
        data: {},
        message: "Password rest successfully",
        success: true
    },
    LogoutResponse: {
        statusCode: 200,
        data: {},
        message: "USer logged out",
        success: true
    },
    CurrentUserResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/User"
        },
        message: "Current user fetched Successfully",
        success: true
    },
    ChangePasswordResponse: {
        statusCode: 200,
        data: {},
        message: "Password changed successfully",
        success: true
    },
    ResendEmailVerificationResponse: {
        statusCode: 200,
        data: {},
        message: "Mail has been sent to your email Id",
        success: true
    }
}