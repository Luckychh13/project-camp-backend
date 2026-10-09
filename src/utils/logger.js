import pino from "pino"

const loggerOptions = {
    level: process.env.LOG_LEVEL || "info"
}

if (process.env.NODE_ENV !== "production") {
    loggerOptions.transport = {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
        }
    }
}

export const logger = pino(loggerOptions)