import {User} from "../models/user.models.js"
import {Project} from "../models/project.models.js"
import {Task} from "../models/task.models.js"
import {SubTask} from "../models/subtask.models.js"
import {ProjectMember} from "../models/projectmembers.models.js"
import { ApiResponse } from "../utils/api-response.js"
import {ApiError} from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"
import mongoose from "mongoose"
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js"


const getTasks = asyncHandler(async(req,res)=>{
    const {projectId} = req.params
    const project = await Project.findById(projectId)
    if(!project){
        throw new ApiError(404,"project not found")
    }

    const tasks = await Task.find({
        project: new mongoose.Types.ObjectId(projectId),
    }).populate("assignedTo","avatar username fullName ")

     return res
      .status(200)
      .json(new ApiResponse(
        200,
        tasks,
        "Task fetched successfully"
    ))

})

const createTask = asyncHandler(async(req,res)=>{
    const {title,description,assignedTo,status} = req.body
    const {projectId} = req.params

    const project = await Project.findById(projectId)
    if(!project){
        throw new ApiError(404,"Project not found")
    }

    const files = req.files || []

    const attachments = files.map((file)=>{
        return {
            url:`${process.env.SERVER_URL}/images/${file.filename}`,
            mimetype: file.mimetype,
            size :file.size
        }
    })

    const task = await Task.create({
        title,
        description,
        project:new mongoose.Types.ObjectId(projectId),
        assignedTo: assignedTo?new mongoose.Types.ObjectId(assignedTo): undefined,
        status,
        assignedBy: new mongoose.Types.ObjectId(req.user._id),
        attachments
    })

    return res
      .status(201)
      .json(new ApiResponse(
        201,
        task,
        "Task created successfully"
    ))

})

const getTaskById = asyncHandler(async(req,res)=>{
    const {projectId,taskId} = req.params
    const task = await Task.aggregate([
        {
            $match:{
               _id:new mongoose.Types.ObjectId(taskId),
               project:new mongoose.Types.ObjectId(projectId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"assignedTo",
                foreignField:"_id",
                as:"assignedTo",
                pipeline:[
                    {
                        $project:{
                            _id:1,
                        username:1,
                        fullName:1,
                        avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"subtasks",
                localField:"_id",
                foreignField:"task",
                as:"subtasks",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"createdBy",
                            foreignField:"_id",
                            as:"createdBy",
                            pipeline:[
                                {
                                    $project:{
                                        _id:1,
                                        username:1,
                                        fullName:1,
                                        avatar:1,

                                    }
                                }
                            ]
                        }
                    },{
                        $addFields:{
                            createdBy:{
                                $arrayElemAt:["$createdBy",0]
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                assignedTo:{
                    $arrayElemAt:["$assignedTo",0]
                }
            }
        }
    ])

    if(!task || task.length === 0){
        throw new ApiError(404,"task not found")
    }

     return res
      .status(200)
      .json(new ApiResponse(
        200,
        task[0],
        "Task fetched successfully"
    ))

})

const updateTask = asyncHandler(async(req,res)=>{
    const {taskId} = req.params
    const {title,description,assignedTo,status} = req.body
    const files = req.files || []

    const newattachments = files.map((file)=>{
        return{
            url:`${process.env.SERVER_URL}/images/${file.filename}`,
            mimetype:file.mimetype,
            size:file.size
        }
    })
    const task = await Task.findByIdAndUpdate(
        taskId,
        {
            $set:{
                title,
                description,
                assignedTo: assignedTo?new mongoose.Types.ObjectId(assignedTo): undefined,
                status
            },
            $push:{
                attachments:{
                    $each:newattachments
                }
            }
        },
        {
            new:true
        }
    ).populate("assignedTo"," username avatar fullName")
    if(!task){
        throw new ApiError(404,"Task not found")
    }

    return res
      .status(200)
      .json(new ApiResponse(
        200,
        task,
        "Task updated successfully"
    ))

})

const deleteTask = asyncHandler(async(req,res)=>{
    const {projectId,taskId} = req.params

    const task = await Task.findOne({
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId)
    })
    if(!task){
        throw new ApiError(404,"Task not found")
    }

    await SubTask.deleteMany({ task: taskId })
    await Task.findByIdAndDelete(taskId)

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        task,
        "Task deleted successfully"
    ))
})

const createSubTask = asyncHandler(async(req,res)=>{
    const {projectId,taskId} = req.params
    const {title} = req.body

    const task = await Task.findOne({
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId)
    })
    if(!task){
        throw new ApiError(404,"Task not found")
    }

    const subTask=await SubTask.create({
        title,
        task: new mongoose.Types.ObjectId(taskId),
        createdBy: new mongoose.Types.ObjectId(req.user._id)

    })

    return res
      .status(201)
      .json(new ApiResponse(
        201,
        subTask,
        "subTask created successfully"
    ))

})

const updateSubTask = asyncHandler(async(req,res)=>{
    const {projectId,subTaskId} = req.params
    const {title,isCompleted} = req.body

    const subTask = await SubTask.findById(subTaskId).populate("task")

    if(!subTask || subTask.task.project.toString() !== projectId){
        throw new ApiError(404,"SubTask not found")
    }

    const updateFields = { isCompleted }

    if(req.user.role !== UserRolesEnum.MEMBER){
        updateFields.title = title
    }

    const updatedSubTask = await SubTask.findByIdAndUpdate(
        subTaskId,
        {
            $set: updateFields
        },
        {
            new:true
        }
    )

    return res
      .status(200)
      .json(new ApiResponse(
        200,
        updatedSubTask,
        "SubTask updated successfully"
    ))
})

const deleteSubTask = asyncHandler(async(req,res)=>{
    const {projectId,subTaskId} = req.params

    const subTask = await SubTask.findById(subTaskId).populate("task")

    if(!subTask || subTask.task.project.toString() !== projectId){
        throw new ApiError(404,"SubTask not found")
    }

    const deletedSubTask = await SubTask.findByIdAndDelete(subTaskId)

    return res
      .status(200)
      .json(new ApiResponse(
        200,
        deletedSubTask,
        "SubTask deleted successfully"
    ))
})

export {
    createSubTask,
    createTask,
    deleteSubTask,
    deleteTask,
    getTaskById,
    getTasks,
    updateSubTask,
    updateTask
}