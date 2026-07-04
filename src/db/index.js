import mongoose from "mongoose"

const connectdb=async ()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI) 
        console.log("MongoDB Connected");
         
    } catch (error) {
        console.log("MongoDB connection error",error)
        process.exit(1)
    }
}

export default connectdb