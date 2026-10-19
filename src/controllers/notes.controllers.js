import mongoose from "mongoose"
import { Note } from "../models/notes.models.js"
import { Project } from "../models/project.models.js"
import { ApiResponse } from "../utils/api-response.js"
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"
import { getPaginationOptions } from "../utils/pagination.js";
import { getSortOptions } from "../utils/sorting.js"
import { getSearchRegex } from "../utils/search.js"

const getNotes = asyncHandler(async (req, res) => {
    // #swagger.autoQuery = false
    /*
        #swagger.tags = ['Notes']
        #swagger.summary = 'Get project notes'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.parameters['page'] = {
            in: 'query',
            description: 'Page number, starting from 1. Defaults to 1.',
            required: false,
            '@schema': {
                type: 'integer',
                minimum: 1,
                default: 1,
                example: 1
            }
        }

        #swagger.parameters['limit'] = {
            in: 'query',
            description: 'Number of notes per page. Maximum is 100.',
            required: false,
            '@schema': {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 10,
                example: 10
            }
        }

        #swagger.parameters['sortBy'] = {
            in: 'query',
            description: 'Field used to sort notes.',
            required: false,
            schema: {
                '@enum': ['title', 'createdAt', 'updatedAt'],
                default: 'createdAt',
                example: 'title'
            }
        }

        #swagger.parameters['order'] = {
            in: 'query',
            description: 'Sort direction.',
            required: false,
            schema: {
                '@enum': ['asc', 'desc'],
                default: 'desc',
                example: 'desc'
            }
        }

        #swagger.parameters['createdBy'] = {
            in: 'query',
            description: 'Filter notes by creator user ID.',
            required: false,
            '@schema': {
                type: 'string',
                pattern: '^[a-fA-F0-9]{24}$',
                example: '507f1f77bcf86cd799439011'
            }
        }

        #swagger.parameters['search'] = {
            in: 'query',
            description: 'Optional case-insensitive partial search. Maximum length: 100 characters.',
            required: false,
            '@schema': {
                type: 'string',
                maxLength: 100,
                example: 'backend'
            }
        }

        #swagger.responses[200] = {
            description: 'Notes fetched successfully',
            schema: {
                $ref: '#/components/schemas/NotesResponse'
            }
        }

        #swagger.responses[400] = {
            description: 'Invalid project ID',
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
    const { page, limit, skip } = getPaginationOptions(req.query);
    const sortOptions = getSortOptions(req.query, ["title", "createdAt", "updatedAt"])
    const { createdBy } = req.query
    const searchRegex = getSearchRegex(req.query.search)

    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    const notesFilter = {
        project: new mongoose.Types.ObjectId(projectId)
    }
    if (createdBy !== undefined) {
        if (
            typeof createdBy !== "string" ||
            !/^[a-fA-F0-9]{24}$/.test(createdBy)
        ) {
            throw new ApiError(400, "Invalid note creator ID");
        }

        notesFilter.createdBy = new mongoose.Types.ObjectId(createdBy);
    }
    if (searchRegex) {
        notesFilter.$or = [
            { title: searchRegex },
            { content: searchRegex },
        ];
    }


    const [notes, totalNotes] = await Promise.all([
        Note.find(notesFilter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "username fullName avatar"),

        Note.countDocuments(notesFilter)
    ])

    const totalPages = Math.ceil(totalNotes / limit)

    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    const nextPage = hasNextPage ? page + 1 : null
    const previousPage = hasPreviousPage ? page - 1 : null


    return res.status(200)
        .json(new ApiResponse(
            200,
            {
                notes,
                pagination: {
                    currentPage: page,
                    limit,
                    totalNotes,
                    totalPages,
                    hasNextPage,
                    nextPage,
                    hasPreviousPage,
                    previousPage
                }
            },
            "Notes fetched successfully"))
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
            description:'Invalid project ID',
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
            description: 'Invalid project ID',
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
            description: 'Invalid project ID',
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
        description: 'Invalid project ID',
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