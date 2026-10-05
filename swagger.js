import swaggerAutogen from "swagger-autogen"
import { noteSchemas } from "./src/docs/schemas/note.schema.js"
import { authSchemas } from "./src/docs/schemas/auth.schema.js"
import { projectSchemas } from "./src/docs/schemas/project.schema.js"
import { taskSchemas } from "./src/docs/schemas/task.schema.js"
import { subTaskSchemas } from "./src/docs/schemas/subTask.schema.js";
import { commonSchemas } from "./src/docs/schemas/common.schema.js";

const options = {
    openapi: "3.0.0"
}

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
            ...noteSchemas,
            ...authSchemas,
            ...projectSchemas,
            ...taskSchemas,
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
            }

        }
    },

}

const generateSwagger = swaggerAutogen(options)

generateSwagger(outputFile, endpointsFiles, doc)