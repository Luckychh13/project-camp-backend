import { body, param } from "express-validator";
import { AvailableTaskStatus, AvailableUserRole } from "../utils/constants.js";


const userRegisterValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("username")
            .trim()
            .notEmpty()
            .withMessage("Username is required")
            .isLowercase()
            .withMessage("Username must be in LowerCase")
            .isLength({ min: 3 })
            .withMessage("Username must be at least 3 characters long"),
        body("password")
            .trim()
            .notEmpty()
            .withMessage("Password is required"),
        body("fullName")
            .optional()
            .trim(),
    ]
}

const userLoginValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("password")
            .notEmpty()
            .withMessage("Password is required")
    ]
}

const userChangeCurrentPasswordValidator = () => {
    return [
        body("oldPassword")
            .notEmpty()
            .withMessage("Old password is required"),
        body("newPassword")
            .notEmpty()
            .withMessage("New Password is required"),

    ]
}

const userForgotPasswordValidator = () => {
    return [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid")
    ]
}

const userResetForgotPasswordValidator = () => {
    return [
        body("newPassword")
            .notEmpty()
            .withMessage("Password is required")
    ]
}

const createProjectValidator = () => {
    return [
        body("name")
            .notEmpty()
            .withMessage("Name is required"),
        body("description")
            .optional()
    ]
}

const addMembertoProjectValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("role")
            .notEmpty()
            .withMessage("Role is required")
            .isIn(AvailableUserRole)
            .withMessage("Role is invalid")
    ]
}

const createTaskValidator = () => {
    return [
        body("title")
            .notEmpty()
            .withMessage("Title is required"),
        body("description")
            .optional(),
        body("assignedTo")
            .optional()
            .isMongoId()
            .withMessage("Invalid assigned id"),
        body("status")
            .optional()
            .isIn(AvailableTaskStatus)
            .withMessage("Task status is invalid")


    ]
}

const updateTaskValidator = () => {
    return [
        param("taskId")
            .isMongoId()
            .withMessage("Invalid task id"),
        body("title")
            .optional({ values: "falsy" })
            .trim()
            .notEmpty(),
        body("description")
            .optional(),
        body("assignedTo")
            .trim()
            .optional({ values: "falsy" })
            .isMongoId()
            .withMessage("Invalid assigned user id"),
        body("status")
            .optional()
            .isIn(AvailableTaskStatus)
            .withMessage("Task status is invalid")
    ]
}

const createSubTaskValidator = () => {
    return [
        param("projectId")
            .isMongoId()
            .withMessage("Invalid project id"),
        param("taskId")
            .isMongoId()
            .withMessage("Invalid task id"),
        body("title")
            .notEmpty()
            .withMessage("Title is required"),
    ]
}

const updateSubTaskValidator = () => {
    return [
        param("projectId")
            .isMongoId()
            .withMessage("Invalid project id"),
        param("subTaskId")
            .isMongoId()
            .withMessage("Invalid subtask id"),
        body("title")
            .optional()
            .notEmpty()
            .withMessage("Title cannot be empty"),
        body("isCompleted")
            .optional()
            .isBoolean()
            .withMessage("isCompleted must be a boolean"),
    ]
}

const createNoteValidator = () => {
    return [
        param("projectId")
            .isMongoId()
            .withMessage("Invalid project id"),

        body("title")
            .trim()
            .notEmpty()
            .withMessage("Title is required"),

        body("content")
            .trim()
            .notEmpty()
            .withMessage("Content is required")
    ]
}

const updateNoteValidator = () => {
    return [
        param("projectId")
            .isMongoId()
            .withMessage("Invalid project id"),

        param("noteId")
            .isMongoId()
            .withMessage("Invalid note id"),

        body("title")
            .trim()
            .notEmpty()
            .withMessage("Title is required"),

        body("content")
            .trim()
            .notEmpty()
            .withMessage("Content is required"),
    ]
}

const getTaskByIdValidator = () => {
    return [
        param("projectId")
            .isMongoId()
            .withMessage("Invalid project id"),

        param("taskId")
            .isMongoId()
            .withMessage("Invalid task id")
    ]
}

const deleteTaskValidator = () => {
    return [
        param("projectId")
            .isMongoId()
            .withMessage("Invalid project id"),

        param("taskId")
            .isMongoId()
            .withMessage("Invalid task id")
    ]
}

const getNoteByIdValidator = () => {
    return [
        param("projectId")
            .isMongoId()
            .withMessage("Invalid project id"),

        param("noteId")
            .isMongoId()
            .withMessage("Invalid note id")
    ]
}

const deleteNoteValidator = () => {
    return [
        param("projectId")
            .isMongoId()
            .withMessage("Invalid project id"),

        param("noteId")
            .isMongoId()
            .withMessage("Invalid note id")
    ]
}

export {
    userRegisterValidator,
    userLoginValidator,
    userChangeCurrentPasswordValidator,
    userForgotPasswordValidator,
    userResetForgotPasswordValidator,
    addMembertoProjectValidator,
    createProjectValidator,
    createTaskValidator,
    updateTaskValidator,
    createSubTaskValidator,
    updateSubTaskValidator,
    createNoteValidator,
    updateNoteValidator,
    getTaskByIdValidator,
    deleteTaskValidator,
    getNoteByIdValidator,
    deleteNoteValidator
}