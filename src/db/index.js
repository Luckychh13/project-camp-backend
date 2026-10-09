import mongoose from "mongoose"
import { logger } from "../utils/logger.js"

const connectdb = async () => {
    await mongoose.connect(process.env.MONGO_URI)

    logger.info("MongoDB connected successfully")
}

export default connectdb