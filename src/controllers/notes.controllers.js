import mongoose from "mongoose"
import { Note } from "../models/notes.models.js"
import { Project } from "../models/project.models.js"
import { ApiResponse } from "../utils/api-response.js"
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"

const getNotes = asyncHandler(async (req, res) => {
  /*
    #swagger.tags = ['Notes']
    #swagger.summary = 'Get project notes'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Notes fetched successfully',
        schema: {
            $ref: '#/components/schemas/NotesResponse'
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
        description: 'User does not have permission to access project notes',
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
        throw new ApiError(404, "Project not found")
    }

    const notes = await Note.find({
        project: new mongoose.Types.ObjectId(projectId)
    })
        .populate("createdBy", "username fullName avatar")
        .sort({ createdAt: -1 })

    return res.status(200).json(new ApiResponse(200, notes, "Notes fetched successfully"))
})

const createNote = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Notes']
    #swagger.summary = 'Create a project note'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: '#/components/schemas/CreateNoteRequest'
                }
            }
        }
    }

    #swagger.responses[201] = {
        description: 'Note created successfully',
        schema: {
            $ref: '#/components/schemas/CreateNoteResponse'
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
        description: 'User does not have permission to create notes',
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

    const { projectId } = req.params
    const { title, content } = req.body

    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    const note = await Note.create({
        title,
        content,
        project: new mongoose.Types.ObjectId(projectId),
        createdBy: req.user._id
    })

    return res.status(201).json(new ApiResponse(201, note, "Note created successfully"))
})

const getNoteById = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Notes']
    #swagger.summary = 'Get note by ID'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Note fetched successfully',
        schema: {
            $ref: '#/components/schemas/NoteResponse'
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
        description: 'User does not have permission to access the note',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Note not found',
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

    #swagger.responses[500] = {
        description: 'Internal server error caused by an invalid note ID format',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }
*/
    const { projectId, noteId } = req.params

    const note = await Note.findOne({
        _id: new mongoose.Types.ObjectId(noteId),
        project: new mongoose.Types.ObjectId(projectId)
    })
        .populate("createdBy", "username fullName avatar")

    if (!note) {
        throw new ApiError(404, "Note not found")
    }

    return res.status(200).json(new ApiResponse(200, note, "Note fetched successfully"))
})

const updateNote = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Notes']
    #swagger.summary = 'Update a Note'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: '#/components/schemas/UpdateNoteRequest'
                }
            }
        }
    }

    #swagger.responses[200] = {
        description: 'Note updated successfully',
        schema: {
            $ref: '#/components/schemas/UpdateNoteResponse'
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
        description: 'User does not have permission to update notes',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Note not found',
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
    const { projectId, noteId } = req.params
    const { title, content } = req.body

    const note = await Note.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(noteId),
            project: new mongoose.Types.ObjectId(projectId)
        },
        {
            title,
            content
        },
        {
            new: true,
            runValidators: true
        }
    )
        .populate("createdBy", "username fullName avatar")

    if (!note) {
        throw new ApiError(404, "Note not found")
    }

    return res.status(200).json(new ApiResponse(200, note, "Note updated successfully"))
})

const deleteNote = asyncHandler(async (req, res) => {
/*
    #swagger.tags = ['Notes']
    #swagger.summary = 'Delete a Note'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Note deleted successfully',
        schema: {
            $ref: '#/components/schemas/DeleteNoteResponse'
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
        description: 'User does not have permission to delete notes',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Note not found',
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

    #swagger.responses[500] = {
        description: 'Internal server error caused by an invalid note ID format',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }
*/    const { projectId, noteId } = req.params

    const note = await Note.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(noteId),
        project: new mongoose.Types.ObjectId(projectId)
    })

    if (!note) {
        throw new ApiError(404, "Note not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                note,
                "Note deleted successfully"
            )
        )
})

export {
    getNotes,
    createNote,
    getNoteById,
    updateNote,
    deleteNote
}