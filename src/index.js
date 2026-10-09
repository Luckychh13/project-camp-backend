import "dotenv/config"

import app from "./app.js"
import connectdb from "./db/index.js";
import { logger } from "./utils/logger.js"

const port = process.env.PORT || 8000;


connectdb()
    .then(() => {
        app.listen(port, () => {
            logger.info(
                { port },
                "Server started successfully"
            )
        })
    })
    .catch((err) => {
        logger.error(
            { err },
            "MongoDB connection failed; server startup aborted"
        )
        process.exit(1);

    })
