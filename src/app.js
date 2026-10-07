import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import swaggerUi from "swagger-ui-express"
import fs from "fs"
import helmet from "helmet"
import { apiRateLimiter } from "./middlewares/rate-limit.middleware.js"

const app = express()
//basic configutrations
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

//cors configurations
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))
const isProduction = process.env.NODE_ENV === "production"
app.use(helmet({
    hsts:isProduction
}))

//Global rate-limiter
app.use("/api/v1", apiRateLimiter)

//import the routes
import healthCheckRouter from "./routes/healthcheck.routes.js"
import authRouter from "./routes/auth.routes.js"
import projectRouter from "./routes/project.routes.js"
import taskRouter from "./routes/task.routes.js"
import notesRouter from "./routes/notes.routes.js"

const swaggerDoc = JSON.parse(
    fs.readFileSync("./swagger-output.json","utf-8")
)

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter)
app.use("/api/v1/tasks", taskRouter)
app.use("/api/v1/notes", notesRouter)
app.use("/api-docs", swaggerUi.serve,swaggerUi.setup(swaggerDoc))
app.get("/", (req, res) => {
    res.send("hello world!");
});

// ADD THESE TWO LINES:
import { errorHandler } from "./middlewares/error.middlewares.js"
app.use(errorHandler)


export default app