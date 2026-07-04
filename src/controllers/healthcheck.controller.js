import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

/* 
const healthcheck=(req,res)=>{
    try {
        res.status(200).json(
            new ApiResponse(200,{message:"Server is running"})
        )
    } catch (error) {}

} */


    const healthcheck=asyncHandler(async(req,res)=>{
        res.status(200).json(
            new ApiResponse(200,{message:"Server is running"})
        )
    })

export {healthcheck};