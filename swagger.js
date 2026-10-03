import swaggerAutogen from "swagger-autogen"
import { noteSchemas } from "./src/docs/schemas/note.schema.js"
import { authSchemas } from "./src/docs/schemas/auth.schema.js"
import { projectSchemas } from "./src/docs/schemas/project.schema.js"

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
            ...noteSchemas,
            ...authSchemas,
            ...projectSchemas
            
        }
    },

}

const generateSwagger = swaggerAutogen(options)

generateSwagger(outputFile, endpointsFiles, doc)