import { User } from "../models/user.models.js"
import { Project } from "../models/project.models.js"
import { Task } from "../models/task.models.js"
import { SubTask } from "../models/subtask.models.js"
import { ProjectMember } from "../models/projectmembers.models.js"
import { ApiResponse } from "../utils/api-response.js"
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"
import mongoose from "mongoose"
import fs from "fs/promises"
import path from "path"
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js"


const getTasks = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Tasks']
        #swagger.summary = 'Get project tasks'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.responses[200] = {
            description: 'Tasks fetched successfully',
            schema: {
                $ref: '#/components/schemas/TasksResponse'
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[404] = {
            description: 'Project not found',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { projectId } = req.params
    const project = await Project.findById(projectId)
    if (!project) {
        throw new ApiError(404, "project not found")
    }

    const tasks = await Task.find({
        project: new mongoose.Types.ObjectId(projectId),
    }).populate("assignedTo", "avatar username fullName ")

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            tasks,
            "Task fetched successfully"
        ))

})

const createTask = asyncHandler(async (req, res) => {
   /*
    #swagger.tags = ['Tasks']
    #swagger.summary = 'Create a new task'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.requestBody = {
        required: true,
        content: {
            "multipart/form-data": {
                schema: {
                    $ref: '#/components/schemas/CreateTaskRequest'
                }
            }
        }
    }

    #swagger.responses[201] = {
        description: 'Task created successfully',
        schema: {
            $ref: '#/components/schemas/CreateTaskResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[403] = {
        description: 'User does not have permission to create tasks',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Project not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[422] = {
        description: 'Validation failed',
        schema: {
            $ref: '#/components/schemas/ValidationErrorResponse'
        }
    }
*/
    const { title, description, assignedTo, status } = req.body
    const { projectId } = req.params

    const project = await Project.findById(projectId)
    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    const files = req.files || []

    const attachments = files.map((file) => {
        return {
            url: `${process.env.SERVER_URL}/images/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size
        }
    })

    const task = await Task.create({
        title,
        description,
        project: new mongoose.Types.ObjectId(projectId),
        assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
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

const getTaskById = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Tasks']
    #swagger.summary = 'Get task by ID'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Task fetched successfully',
        schema: {
            $ref: '#/components/schemas/TaskDetailResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Task not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }
*/
    const { projectId, taskId } = req.params
    const task = await Task.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
                project: new mongoose.Types.ObjectId(projectId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedTo",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "subtasks",
                localField: "_id",
                foreignField: "task",
                as: "subtasks",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "createdBy",
                            foreignField: "_id",
                            as: "createdBy",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,

                                    }
                                }
                            ]
                        }
                    }, {
                        $addFields: {
                            createdBy: {
                                $arrayElemAt: ["$createdBy", 0]
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                assignedTo: {
                    $arrayElemAt: ["$assignedTo", 0]
                }
            }
        }
    ])

    if (!task || task.length === 0) {
        throw new ApiError(404, "task not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            task[0],
            "Task fetched successfully"
        ))

})

const updateTask = asyncHandler(async (req, res) => {
    /*
    #swagger.tags = ['Tasks']
    #swagger.summary = 'Update task'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.requestBody = {
        required: true,
        content: {
            "multipart/form-data": {
                schema: {
                    $ref: '#/components/schemas/UpdateTaskRequest'
                }
            }
        }
    }

    #swagger.responses[200] = {
        description: 'Task updated successfully',
        schema: {
            $ref: '#/components/schemas/UpdateTaskResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[403] = {
        description: 'User does not have permission to update tasks',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Task not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[422] = {
        description: 'Validation failed',
        schema: {
            $ref: '#/components/schemas/ValidationErrorResponse'
        }
    }
*/
    const { taskId, projectId } = req.params
    const { title, description, assignedTo, status } = req.body
    const files = req.files || []
    const updateData = {}

    if (title !== undefined && title !== "") {
        updateData.title = title
    }

    if (description !== undefined && description !== "") {
        updateData.description = description
    }

    if (assignedTo !== undefined && assignedTo !== "") {
        updateData.assignedTo = new mongoose.Types.ObjectId(assignedTo)
    }

    if (status !== undefined && status !== "") {
        updateData.status = status
    }

    const newattachments = files.map((file) => {
        return {
            url: `${process.env.SERVER_URL}/images/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size
        }
    })

    if (
        Object.keys(updateData).length === 0 &&
        newattachments.length === 0
    ) {
        throw new ApiError(400, "At least one field is required to update task")
    }

    const updateOperation = {
        $set: updateData
    }

    if (newattachments.length > 0) {
        updateOperation.$push = {
            attachments: {
                $each: newattachments
            }
        }
    }

    const task = await Task.findOneAndUpdate(
        {
            _id: taskId,
            project: projectId
        },
        updateOperation,
        {
            new: true
        }
    ).populate("assignedTo", "username avatar fullName")

    if (!task) {
        throw new ApiError(404, "Task not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                task,
                "Task updated successfully"
            )
        )

})

const deleteTask = asyncHandler(async (req, res) => {
    /*
    #swagger.tags = ['Tasks']
    #swagger.summary = 'Delete task'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Task deleted successfully',
        schema: {
            $ref: '#/components/schemas/DeleteTaskResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[403] = {
        description: 'User does not have permission to delete tasks',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Task not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }
*/
    const { projectId, taskId } = req.params

    const task = await Task.findOne({
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId)
    })
    if (!task) {
        throw new ApiError(404, "Task not found")
    }

    for (const attachment of task.attachments || []) {
        const fileName = attachment.url?.split("/images/")[1]

        if (!fileName) {
            continue
        }

        const filePath = path.join(
            process.cwd(),
            "public",
            "images",
            fileName
        )

        try {
            await fs.unlink(filePath)
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error
            }
        }
    }

    await SubTask.deleteMany({ task: taskId })
    await Task.findByIdAndDelete(taskId)

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Task deleted successfully"
        ))
})

const createSubTask = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Subtasks']
    #swagger.summary = 'Create a new subtask'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: '#/components/schemas/CreateSubTaskRequest'
                }
            }
        }
    }

    #swagger.responses[201] = {
        description: 'Subtask created successfully',
        schema: {
            $ref: '#/components/schemas/CreateSubTaskResponse'
        }
    }

    #swagger.responses[400] = {
        description: 'Invalid project ID or user is not a member of the project',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[403] = {
        description: 'User does not have permission to create subtasks',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Task not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[422] = {
        description: 'Validation failed',
        schema: {
            $ref: '#/components/schemas/ValidationErrorResponse'
        }
    }
*/
    const { projectId, taskId } = req.params
    const { title } = req.body

    const task = await Task.findOne({
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId)
    })
    if (!task) {
        throw new ApiError(404, "Task not found")
    }

    const subTask = await SubTask.create({
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

const updateSubTask = asyncHandler(async (req, res) => {
 /*
    #swagger.tags = ['Subtasks']
    #swagger.summary = 'Update subtask'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: '#/components/schemas/UpdateSubTaskRequest'
                }
            }
        }
    }

    #swagger.responses[200] = {
        description: 'Subtask updated successfully',
        schema: {
            $ref: '#/components/schemas/UpdateSubTaskResponse'
        }
    }

    #swagger.responses[400] = {
        description: 'Invalid project ID or user is not a member of the project',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[403] = {
        description: 'User does not have permission to update the subtask',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Subtask not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[422] = {
        description: 'Validation failed',
        schema: {
            $ref: '#/components/schemas/ValidationErrorResponse'
        }
    }
*/
    const { projectId, subTaskId } = req.params
    const { title, isCompleted } = req.body

    const subTask = await SubTask.findById(subTaskId).populate("task")

    if (!subTask || subTask.task.project.toString() !== projectId) {
        throw new ApiError(404, "SubTask not found")
    }

    const updateFields = { isCompleted }

    if (req.user.role !== UserRolesEnum.MEMBER) {
        updateFields.title = title
    }

    const updatedSubTask = await SubTask.findByIdAndUpdate(
        subTaskId,
        {
            $set: updateFields
        },
        {
            new: true
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

const deleteSubTask = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Subtasks']
    #swagger.summary = 'Delete subtask'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Subtask deleted successfully',
        schema: {
            $ref: '#/components/schemas/DeleteSubTaskResponse'
        }
    }

    #swagger.responses[400] = {
        description: 'Invalid project ID or user is not a member of the project',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[403] = {
        description: 'User does not have permission to delete the subtask',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Subtask not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }
*/
    const { projectId, subTaskId } = req.params

    const subTask = await SubTask.findById(subTaskId).populate("task")

    if (!subTask || subTask.task.project.toString() !== projectId) {
        throw new ApiError(404, "SubTask not found")
    }

    const deletedSubTask = await SubTask.findByIdAndDelete(subTaskId)

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
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