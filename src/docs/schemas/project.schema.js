export const projectSchemas = {
    CreateProjectRequest: {
        $name: "My Project",
        description: "A project management application"
    },
    UpdateProjectRequest: {
        $name: "Updated Project",
        description: "Updated project description"
    },
    AddProjectMemberRequest: {
        $email: "member@example.com",
        $role: "member"
    },
    UpdateProjectMemberRequest: {
        $newRole: "project_admin"
    },
    Project: {
        $_id: "65f1a2b3c4d5e6f789012345",
        $name: "My Project",
        description: "A project management application",
        $createdBy: "65f1a2b3c4d5e6f789012346",
        createdAt: "2026-10-02T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z"
    },
    ProjectListItem: {
        project: {
            $_id: "65f1a2b3c4d5e6f789012345",
            $name: "My Project",
            description: "A project management application",
            members: 3,
            $createdBy: "65f1a2b3c4d5e6f789012346",
            createdAt: "2026-10-02T10:00:00.000Z"
        },
        $role: "MEMBER"
    },
    ProjectResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/Project"
        },
        message: "Project fetched successfully",
        success: true
    },
    ProjectsPagination: {
        $currentPage: 1,
        $limit: 10,
        $totalProjects: 8,
        $totalPages: 1,
        $hasNextPage: false,
        $nextPage: {
            type: "integer",
            nullable: true,
            example: null
        },
        $hasPreviousPage: false,
        $previousPage: {
            type: "integer",
            nullable: true,
            example: null
        }
    },
    ProjectMembersPagination: {
        $currentPage: 1,
        $limit: 10,
        $totalMembers: 18,
        $totalPages: 2,
        $hasNextPage: true,
        $nextPage: {
            type: "integer",
            nullable: true,
            example: 2
        },
        $hasPreviousPage: false,
        $previousPage: {
            type: "integer",
            nullable: true,
            example: null
        }
    },
    ProjectsResponse: {
        statusCode: 200,
        data: {
            projects: {
                type: "array",
                items: {
                    $ref: "#/components/schemas/ProjectListItem"
                }
            },
            pagination: {
                $ref: "#/components/schemas/ProjectsPagination"
            }
        },
        message: "Projects fetched successfully",
        success: true
    },
    CreateProjectResponse: {
        statusCode: 201,
        data: {
            $ref: "#/components/schemas/Project"
        },
        message: "Project created successfully",
        success: true
    },
    UpdateProjectResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/Project"
        },
        message: "Project updated successfully",
        success: true
    },
    DeleteProjectResponse: {
        statusCode: 200,
        data: {},
        message: "Project deleted successfully",
        success: true
    },
    ProjectMemberUser: {
        $_id: "6abf6cb126cb15518e7b7691",
        avatar: {
            url: "https://placehold.co/200x200",
            localPath: "",
            $_id: "6abf6cb126cb15518e7b7690"
        },
        $username: "jhon"
    },
    ProjectMember: {
        $user: {
            $ref: "#/components/schemas/ProjectMemberUser"
        },
        $project: "6ac0b81fdfdb027374b0ec46",
        $role: "member",
        $createdAt: "2026-10-03T08:09:03.962Z",
        $updatedAt: "2026-10-03T08:09:03.962Z"
    },
    AddProjectMemberResponse: {
        statusCode: 201,
        data: {},
        message: "Added project member role",
        success: true
    },
    ProjectMemberResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/ProjectMember"
        },
        message: "Project member fetched successfully",
        success: true
    },
    ProjectMembersResponse: {
        statusCode: 200,
        data: {
            members: {
                type: "array",
                items: {
                    $ref: "#/components/schemas/ProjectMember"
                }
            },
            pagination: {
                $ref: "#/components/schemas/ProjectMembersPagination"
            }
        },
        message: "Project members fetched successfully",
        success: true
    },
    UpdateProjectMemberResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/ProjectMember"
        },
        message: "Project member role updated successfully",
        success: true
    },
    DeleteProjectMemberResponse: {
        statusCode: 200,
        data: {},
        message: "Project member deleted successfully",
        success: true
    },
};