import swaggerAutogen from "swagger-autogen"
import { noteSchemas } from "./src/docs/schemas/note.schema.js"
import { authSchemas } from "./src/docs/schemas/auth.schema.js"
import { projectSchemas } from "./src/docs/schemas/project.schema.js"
import { taskSchemas } from "./src/docs/schemas/task.schema.js"
import { subTaskSchemas } from "./src/docs/schemas/subTask.schema.js";
import { commonSchemas } from "./src/docs/schemas/common.schema.js";
const {
    TasksResponse: oldTasksResponse,
    TaskPagination: oldTaskPagination,
    ...taskSchemasBase
} = taskSchemas;
const {
    NotesResponse: oldNotesResponse,
    NotePagination: oldNotePagination,
    ...noteSchemasBase
} = noteSchemas;
const options = {
    openapi: "3.0.0"
}

const {
    ProjectsResponse: oldProjectsResponse,
    ProjectsPagination: oldProjectsPagination,
    ProjectMembersResponse: oldProjectMembersResponse,
    ProjectMembersPagination: oldProjectMembersPagination,
    ...projectSchemasBase
} = projectSchemas;

const outputFile = "./swagger-output.json"

const endpointsFiles = [
    "./src/app.js"
]

const doc = {
    info: {
        title: "Project Management API",
        version: "1.0.0",
        description: "API documentation for the Project Management application"
    },

    servers: [
        {
            url: "http://localhost:8000",
            description: "Local development server"
        }
    ],

    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
            }
        },
        schemas: {
            ...commonSchemas,
            ...noteSchemasBase,
            ...authSchemas,
            ...projectSchemasBase,
            ...taskSchemasBase,
            ...subTaskSchemas

        },
        '@schemas': {
            CreateTaskRequest: {
                type: "object",
                required: ["title"],
                properties: {
                    title: {
                        type: "string",
                        example: "Implement authentication"
                    },
                    description: {
                        type: "string",
                        example: "Implement JWT authentication"
                    },
                    assignedTo: {
                        type: "string",
                        example: "65f1a2b3c4d5e6f789012349"
                    },
                    status: {
                        type: "string",
                        enum: ["todo", "in_progress", "done"],
                        example: "todo"
                    },
                    attachments: {
                        type: "array",
                        maxItems: 5,
                        items: {
                            type: "string",
                            format: "binary"
                        }
                    }
                }
            },
            UpdateTaskRequest: {
                type: "object",
                properties: {
                    title: {
                        type: "string",
                        example: "Updated task title"
                    },
                    description: {
                        type: "string",
                        example: "Updated task description"
                    },
                    assignedTo: {
                        type: "string",
                        example: "65f1a2b3c4d5e6f789012349"
                    },
                    status: {
                        type: "string",
                        enum: ["todo", "in_progress", "done"],
                        example: "in_progress"
                    },
                    attachments: {
                        type: "array",
                        maxItems: 5,
                        items: {
                            type: "string",
                            format: "binary"
                        }
                    }
                }
            },
            TaskPagination: {
                type: 'object',
                properties: {
                    currentPage: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    totalTasks: { type: 'integer', example: 23 },
                    totalPages: { type: 'integer', example: 3 },
                    hasNextPage: { type: 'boolean', example: true },
                    nextPage: { type: 'integer', nullable: true, example: 2 },
                    hasPreviousPage: { type: 'boolean', example: true },
                    previousPage: { type: 'integer', nullable: true, example: 1 }
                }
            },
            TasksResponse: {
                type: 'object',
                properties: {
                    statusCode: { type: 'integer', example: 200 },
                    data: {
                        type: 'object',
                        properties: {
                            tasks: {
                                type: 'array',
                                items: {
                                    $ref: '#/components/schemas/TaskListItem'
                                }
                            },
                            pagination: {
                                $ref: '#/components/schemas/TaskPagination'
                            }
                        }
                    },
                    message: { type: 'string', example: 'Tasks fetched successfully' },
                    success: { type: 'boolean', example: true }
                }
            },
            NotePagination: {
                type: 'object',
                properties: {
                    currentPage: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    totalNotes: { type: 'integer', example: 15 },
                    totalPages: { type: 'integer', example: 2 },
                    hasNextPage: { type: 'boolean', example: true },
                    nextPage: { type: 'integer', nullable: true, example: 2 },
                    hasPreviousPage: { type: 'boolean', example: false },
                    previousPage: { type: 'integer', nullable: true, example: null }
                }
            },
            NotesResponse: {
                type: 'object',
                properties: {
                    statusCode: { type: 'integer', example: 200 },
                    data: {
                        type: 'object',
                        properties: {
                            notes: {
                                type: 'array',
                                items: {
                                    $ref: '#/components/schemas/Note'
                                }
                            },
                            pagination: {
                                $ref: '#/components/schemas/NotePagination'
                            }
                        }
                    },
                    message: { type: 'string', example: 'Notes fetched successfully' },
                    success: { type: 'boolean', example: true }
                }
            },
            ProjectsPagination: {
                type: 'object',
                properties: {
                    currentPage: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    totalProjects: { type: 'integer', example: 8 },
                    totalPages: { type: 'integer', example: 1 },
                    hasNextPage: { type: 'boolean', example: false },
                    nextPage: { type: 'integer', nullable: true, example: null },
                    hasPreviousPage: { type: 'boolean', example: false },
                    previousPage: { type: 'integer', nullable: true, example: null }
                }
            },
            ProjectsResponse: {
                type: 'object',
                properties: {
                    statusCode: { type: 'integer', example: 200 },
                    data: {
                        type: 'object',
                        properties: {
                            projects: {
                                type: 'array',
                                items: {
                                    $ref: '#/components/schemas/ProjectListItem'
                                }
                            },
                            pagination: {
                                $ref: '#/components/schemas/ProjectsPagination'
                            }
                        }
                    },
                    message: { type: 'string', example: 'Projects fetched successfully' },
                    success: { type: 'boolean', example: true }
                }
            },
            ProjectMembersPagination: {
                type: 'object',
                properties: {
                    currentPage: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    totalMembers: { type: 'integer', example: 18 },
                    totalPages: { type: 'integer', example: 2 },
                    hasNextPage: { type: 'boolean', example: false },
                    nextPage: { type: 'integer', nullable: true, example: null },
                    hasPreviousPage: { type: 'boolean', example: true },
                    previousPage: { type: 'integer', nullable: true, example: 1 }
                }
            },
            ProjectMembersResponse: {
                type: 'object',
                properties: {
                    statusCode: { type: 'integer', example: 200 },
                    data: {
                        type: 'object',
                        properties: {
                            members: {
                                type: 'array',
                                items: {
                                    $ref: '#/components/schemas/ProjectMember'
                                }
                            },
                            pagination: {
                                $ref: '#/components/schemas/ProjectMembersPagination'
                            }
                        }
                    },
                    message: {
                        type: 'string',
                        example: 'Project members fetched successfully'
                    },
                    success: { type: 'boolean', example: true }
                }
            }

        }
    },

}

const generateSwagger = swaggerAutogen(options)

generateSwagger(outputFile, endpointsFiles, doc)