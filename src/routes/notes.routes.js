import { Router } from "express"

import {
    getNotes,
    createNote,
    getNoteById,
    updateNote,
    deleteNote
} from "../controllers/notes.controllers.js"

import {
    createNoteValidator,
    updateNoteValidator,
    getNoteByIdValidator,
    deleteNoteValidator
} from "../validators/index.js"

import {
    verifyJWT,
    validateProjectPermissions
} from "../middlewares/auth.middleware.js"

import {
    AvailableUserRole,
    UserRolesEnum
} from "../utils/constants.js"

import { validate } from "../middlewares/validator.middleware.js"

const router = Router()

router.use(verifyJWT)

router
    .route("/:projectId")
    .get(
        validateProjectPermissions(AvailableUserRole),
        getNotes
    )
    .post(
        validateProjectPermissions([UserRolesEnum.ADMIN]),
        createNoteValidator(),
        validate,
        createNote
    )

router
    .route("/:projectId/n/:noteId")
    .get(
        getNoteByIdValidator(),
        validate,
        validateProjectPermissions(AvailableUserRole),
        getNoteById
    )
    .put(
        validateProjectPermissions([UserRolesEnum.ADMIN]),
        updateNoteValidator(),
        validate,
        updateNote
    )
    .delete(
        deleteNoteValidator(),
        validate,
        validateProjectPermissions([UserRolesEnum.ADMIN]),
        deleteNote
    )

export default router    