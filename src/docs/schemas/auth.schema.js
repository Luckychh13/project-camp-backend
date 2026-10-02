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
    }
}