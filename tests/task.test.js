import "dotenv/config"
import mongoose from "mongoose"
import request from "supertest"
import app from "../src/app.js"
import fs from "fs/promises"
import path from "path"

import { Task } from "../src/models/task.models.js"
import { SubTask } from "../src/models/subtask.models.js"
import { ProjectMember } from "../src/models/projectmembers.models.js"
import { User } from "../src/models/user.models.js"

import { UserRolesEnum, TaskStatusEnum } from "../src/utils/constants.js"

import {
    createTestUser,
    createTestAuthSetup,
    createTestSetup,
    cleanupTestData
} from "./helpers/testSetup.js"

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000
    })
}, 15000)

afterAll(async () => {
    await mongoose.connection.close()
}, 15000)

describe("Task API", () => {

    test("should reject create task without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .post(`/api/v1/tasks/${fakeProjectId}`)
            .send({
                title: "Test Task",
                description: "Test task description"
            })

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should reject create task without title", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    description: "Task without title"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Recieved data is not valid"
            )

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: "Title is required"
                    })
                ])
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create task with invalid assignedTo", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Test Task",
                    description: "Task description",
                    assignedTo: "invalid-user-id"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Recieved data is not valid"
            )

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        assignedTo: "Invalid assigned id"
                    })
                ])
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create task with invalid status", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Test Task",
                    description: "Task description",
                    status: "invalid_status"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Recieved data is not valid"
            )

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        status: "Task status is invalid"
                    })
                ])
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should create task successfully", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Test Task",
                    description: "Test task description"
                })

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task created successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data.title).toBe("Test Task")
            expect(response.body.data.description).toBe(
                "Test task description"
            )
            expect(response.body.data.project).toBe(
                testData.project._id
            )
            expect(response.body.data.assignedBy).toBe(
                testData.user._id.toString()
            )
            expect(response.body.data.status).toBe(
                TaskStatusEnum.TODO
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should create task successfully as project admin", async () => {
        const testData = await createTestSetup({
            role: UserRolesEnum.PROJECT_ADMIN
        })

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Project Admin Task",
                    description: "Task created by project admin"
                })

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task created successfully"
            )

            expect(response.body.data.title).toBe(
                "Project Admin Task"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create task when requester is a member", async () => {
        const testData = await createTestSetup({
            role: UserRolesEnum.MEMBER
        })

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Member Task",
                    description: "Member should not create task"
                })

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create task when requester is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const response = await nonMemberData.agent
                .post(`/api/v1/tasks/${ownerData.project._id}`)
                .send({
                    title: "Non Member Task"
                })

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should create task with assigned user", async () => {
        const testData = await createTestSetup()
        const assignedUserData = await createTestAuthSetup()

        await ProjectMember.create({
            user: assignedUserData.user._id,
            project: testData.project._id,
            role: UserRolesEnum.MEMBER
        })

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Assigned Task",
                    description: "Task with assigned user",
                    assignedTo: assignedUserData.user._id.toString()
                })

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.data.title).toBe(
                "Assigned Task"
            )
            expect(response.body.data.assignedTo).toBe(
                assignedUserData.user._id.toString()
            )
        } finally {
            await ProjectMember.deleteOne({
                user: assignedUserData.user._id,
                project: testData.project._id
            })

            await cleanupTestData(testData)
            await cleanupTestData(assignedUserData)
        }
    }, 15000)


    test("should reject get tasks without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .get(`/api/v1/tasks/${fakeProjectId}`)

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should get tasks successfully", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Task For Fetch",
                    description: "Task fetch test"
                })

            expect(createResponse.statusCode).toBe(201)

            const response = await testData.agent
                .get(`/api/v1/tasks/${testData.project._id}`)

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task fetched successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data.length).toBeGreaterThan(0)

            expect(
                response.body.data.some(
                    task => task.title === "Task For Fetch"
                )
            ).toBe(true)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject get tasks when user is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const response = await nonMemberData.agent
                .get(
                    `/api/v1/tasks/${ownerData.project._id}`
                )

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should reject get task by id without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()
        const fakeTaskId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .get(
                `/api/v1/tasks/${fakeProjectId}/t/${fakeTaskId}`
            )

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should get task by id successfully", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Single Task",
                    description: "Single task test"
                })

            const task = createResponse.body.data

            const response = await testData.agent
                .get(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task fetched successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data._id).toBe(task._id)
            expect(response.body.data.title).toBe(
                "Single Task"
            )
            expect(response.body.data.description).toBe(
                "Single task test"
            )
            expect(response.body.data.subtasks).toBeDefined()
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject get task by id when task does not exist", async () => {
        const testData = await createTestSetup()
        const fakeTaskId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .get(
                    `/api/v1/tasks/${testData.project._id}/t/${fakeTaskId}`
                )

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "task not found"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject get task by id when user is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const createResponse = await ownerData.agent
                .post(`/api/v1/tasks/${ownerData.project._id}`)
                .send({
                    title: "Private Task"
                })

            const task = createResponse.body.data

            const response = await nonMemberData.agent
                .get(
                    `/api/v1/tasks/${ownerData.project._id}/t/${task._id}`
                )

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should reject update task without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()
        const fakeTaskId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .patch(
                `/api/v1/tasks/${fakeProjectId}/t/${fakeTaskId}`
            )
            .send({
                title: "Updated Task"
            })

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should update task without providing title", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Original Task"
                })

            expect(createResponse.statusCode).toBe(201)

            const task = createResponse.body.data

            const response = await testData.agent
                .patch(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}`
                )
                .send({
                    description: "Updated description"
                })

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task updated successfully"
            )

            expect(response.body.data.title).toBe(
                "Original Task"
            )

            expect(response.body.data.description).toBe(
                "Updated description"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject update task with invalid task id", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .patch(
                    `/api/v1/tasks/${testData.project._id}/t/invalid-task-id`
                )
                .send({
                    title: "Updated Task"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        taskId: "Invalid task id"
                    })
                ])
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should update task successfully", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Original Task",
                    description: "Original description"
                })

            const task = createResponse.body.data

            const response = await testData.agent
                .patch(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}`
                )
                .send({
                    title: "Updated Task",
                    description: "Updated description",
                    status: TaskStatusEnum.IN_PROGRESS
                })

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task updated successfully"
            )

            expect(response.body.data.title).toBe(
                "Updated Task"
            )
            expect(response.body.data.description).toBe(
                "Updated description"
            )
            expect(response.body.data.status).toBe(
                TaskStatusEnum.IN_PROGRESS
            )

            const updatedTask = await Task.findById(task._id)

            expect(updatedTask).toBeDefined()
            expect(updatedTask.title).toBe("Updated Task")
            expect(updatedTask.description).toBe(
                "Updated description"
            )
            expect(updatedTask.status).toBe(
                TaskStatusEnum.IN_PROGRESS
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject update task with invalid status", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Original Task"
                })

            const task = createResponse.body.data

            const response = await testData.agent
                .patch(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}`
                )
                .send({
                    title: "Updated Task",
                    status: "invalid_status"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Recieved data is not valid"
            )

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        status: "Task status is invalid"
                    })
                ])
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject update task when requester is a member", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            const createResponse = await ownerData.agent
                .post(`/api/v1/tasks/${ownerData.project._id}`)
                .send({
                    title: "Member Update Test"
                })

            const task = createResponse.body.data

            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            await mongoose.connection.collection("projectmembers").insertOne({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .patch(
                    `/api/v1/tasks/${ownerData.project._id}/t/${task._id}`
                )
                .send({
                    title: "Changed By Member"
                })

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)


    test("should reject update task when user is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const createResponse = await ownerData.agent
                .post(`/api/v1/tasks/${ownerData.project._id}`)
                .send({
                    title: "Non Member Update"
                })

            const task = createResponse.body.data

            const response = await nonMemberData.agent
                .patch(
                    `/api/v1/tasks/${ownerData.project._id}/t/${task._id}`
                )
                .send({
                    title: "Changed"
                })

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should reject update task when task does not exist", async () => {
        const testData = await createTestSetup()
        const fakeTaskId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .patch(
                    `/api/v1/tasks/${testData.project._id}/t/${fakeTaskId}`
                )
                .send({
                    title: "Updated Task"
                })

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Task not found"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject delete task without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()
        const fakeTaskId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .delete(
                `/api/v1/tasks/${fakeProjectId}/t/${fakeTaskId}`
            )

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should delete task successfully", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    title: "Task To Delete"
                })

            const task = createResponse.body.data

            const subTaskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "SubTask To Delete With Task"
                })

            expect(subTaskResponse.statusCode).toBe(201)

            const response = await testData.agent
                .delete(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task deleted successfully"
            )

            const deletedTask = await Task.findById(task._id)

            expect(deletedTask).toBeNull()

            const remainingSubTasks = await SubTask.find({
                task: task._id
            })

            expect(remainingSubTasks).toHaveLength(0)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject delete task when requester is a member", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            const createResponse = await ownerData.agent
                .post(`/api/v1/tasks/${ownerData.project._id}`)
                .send({
                    title: "Delete Permission Task"
                })

            const task = createResponse.body.data

            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .delete(
                    `/api/v1/tasks/${ownerData.project._id}/t/${task._id}`
                )

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)


    test("should reject delete task when task does not exist", async () => {
        const testData = await createTestSetup()
        const fakeTaskId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .delete(
                    `/api/v1/tasks/${testData.project._id}/t/${fakeTaskId}`
                )

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Task not found"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create subtask without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()
        const fakeTaskId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .post(
                `/api/v1/tasks/${fakeProjectId}/t/${fakeTaskId}/subtasks`
            )
            .send({
                title: "Test SubTask"
            })

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should reject create subtask without title", async () => {
        const testData = await createTestSetup()

        try {
            const taskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            const response = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}/subtasks`
                )
                .send({})

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Recieved data is not valid"
            )

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: "Title is required"
                    })
                ])
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should create subtask successfully", async () => {
        const testData = await createTestSetup()

        try {
            const taskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            const response = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "Test SubTask"
                })

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "subTask created successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data.title).toBe(
                "Test SubTask"
            )
            expect(response.body.data.task).toBe(
                task._id
            )
            expect(response.body.data.createdBy).toBe(
                testData.user._id.toString()
            )
            expect(response.body.data.isCompleted).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create subtask when requester is a member", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            const taskResponse = await ownerData.agent
                .post(
                    `/api/v1/tasks/${ownerData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .post(
                    `/api/v1/tasks/${ownerData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "Member SubTask"
                })

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)


    test("should reject create subtask when task does not exist", async () => {
        const testData = await createTestSetup()
        const fakeTaskId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}/t/${fakeTaskId}/subtasks`
                )
                .send({
                    title: "Missing Task SubTask"
                })

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Task not found"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should update subtask successfully", async () => {
        const testData = await createTestSetup()

        try {
            const taskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            const subTaskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "Original SubTask"
                })

            const subTask = subTaskResponse.body.data

            const response = await testData.agent
                .put(
                    `/api/v1/tasks/${testData.project._id}/st/${subTask._id}`
                )
                .send({
                    title: "Updated SubTask",
                    isCompleted: true
                })

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "SubTask updated successfully"
            )

            expect(response.body.data.title).toBe(
                "Updated SubTask"
            )
            expect(response.body.data.isCompleted).toBe(true)

            const updatedSubTask = await SubTask.findById(
                subTask._id
            )

            expect(updatedSubTask).toBeDefined()
            expect(updatedSubTask.title).toBe(
                "Updated SubTask"
            )
            expect(updatedSubTask.isCompleted).toBe(true)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject update subtask with invalid isCompleted", async () => {
        const testData = await createTestSetup()

        try {
            const taskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            const subTaskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "SubTask"
                })

            const subTask = subTaskResponse.body.data

            const response = await testData.agent
                .put(
                    `/api/v1/tasks/${testData.project._id}/st/${subTask._id}`
                )
                .send({
                    isCompleted: "not-a-boolean"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Recieved data is not valid"
            )

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        isCompleted: "isCompleted must be a boolean"
                    })
                ])
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject update subtask when member tries to change title", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            const taskResponse = await ownerData.agent
                .post(
                    `/api/v1/tasks/${ownerData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            const subTaskResponse = await ownerData.agent
                .post(
                    `/api/v1/tasks/${ownerData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "Original SubTask"
                })

            const subTask = subTaskResponse.body.data

            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .put(
                    `/api/v1/tasks/${ownerData.project._id}/st/${subTask._id}`
                )
                .send({
                    title: "Changed By Member",
                    isCompleted: true
                })

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "SubTask updated successfully"
            )

            expect(response.body.data.title).toBe(
                "Original SubTask"
            )
            expect(response.body.data.isCompleted).toBe(true)

            const updatedSubTask = await SubTask.findById(
                subTask._id
            )

            expect(updatedSubTask.title).toBe(
                "Original SubTask"
            )
            expect(updatedSubTask.isCompleted).toBe(true)
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)


    test("should reject update subtask when subtask does not exist", async () => {
        const testData = await createTestSetup()
        const fakeSubTaskId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .put(
                    `/api/v1/tasks/${testData.project._id}/st/${fakeSubTaskId}`
                )
                .send({
                    title: "Updated SubTask",
                    isCompleted: true
                })

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "SubTask not found"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject update subtask when user is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const taskResponse = await ownerData.agent
                .post(
                    `/api/v1/tasks/${ownerData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            const subTaskResponse = await ownerData.agent
                .post(
                    `/api/v1/tasks/${ownerData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "SubTask"
                })

            const subTask = subTaskResponse.body.data

            const response = await nonMemberData.agent
                .put(
                    `/api/v1/tasks/${ownerData.project._id}/st/${subTask._id}`
                )
                .send({
                    title: "Changed",
                    isCompleted: true
                })

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should reject delete subtask without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()
        const fakeSubTaskId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .delete(
                `/api/v1/tasks/${fakeProjectId}/st/${fakeSubTaskId}`
            )

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should delete subtask successfully", async () => {
        const testData = await createTestSetup()

        try {
            const taskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            const subTaskResponse = await testData.agent
                .post(
                    `/api/v1/tasks/${testData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "SubTask To Delete"
                })

            const subTask = subTaskResponse.body.data

            const response = await testData.agent
                .delete(
                    `/api/v1/tasks/${testData.project._id}/st/${subTask._id}`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "SubTask deleted successfully"
            )

            const deletedSubTask = await SubTask.findById(
                subTask._id
            )

            expect(deletedSubTask).toBeNull()
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject delete subtask when requester is a member", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            const taskResponse = await ownerData.agent
                .post(
                    `/api/v1/tasks/${ownerData.project._id}`
                )
                .send({
                    title: "Parent Task"
                })

            const task = taskResponse.body.data

            const subTaskResponse = await ownerData.agent
                .post(
                    `/api/v1/tasks/${ownerData.project._id}/t/${task._id}/subtasks`
                )
                .send({
                    title: "Member Delete Test"
                })

            const subTask = subTaskResponse.body.data

            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .delete(
                    `/api/v1/tasks/${ownerData.project._id}/st/${subTask._id}`
                )

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)


    test("should reject delete subtask when subtask does not exist", async () => {
        const testData = await createTestSetup()
        const fakeSubTaskId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .delete(
                    `/api/v1/tasks/${testData.project._id}/st/${fakeSubTaskId}`
                )

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "SubTask not found"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should create task with attachment successfully", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task With Attachment")
                .field("description", "Task with uploaded file")
                .attach(
                    "attachments",
                    Buffer.from("This is a test file"),
                    "test.txt"
                )

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task created successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data.title).toBe(
                "Task With Attachment"
            )

            expect(response.body.data.attachments).toBeDefined()
            expect(response.body.data.attachments).toHaveLength(1)

            expect(response.body.data.attachments[0]).toEqual(
                expect.objectContaining({
                    mimetype: "text/plain",
                    size: expect.any(Number)
                })
            )

            expect(response.body.data.attachments[0].url).toContain(
                "/images/"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should create task with five attachments successfully", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task With Five Attachments")
                .field("description", "Task with five uploaded files")
                .attach(
                    "attachments",
                    Buffer.from("Test file 1"),
                    "test1.txt"
                )
                .attach(
                    "attachments",
                    Buffer.from("Test file 2"),
                    "test2.txt"
                )
                .attach(
                    "attachments",
                    Buffer.from("Test file 3"),
                    "test3.txt"
                )
                .attach(
                    "attachments",
                    Buffer.from("Test file 4"),
                    "test4.txt"
                )
                .attach(
                    "attachments",
                    Buffer.from("Test file 5"),
                    "test5.txt"
                )

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task created successfully"
            )

            expect(response.body.data.attachments).toBeDefined()
            expect(response.body.data.attachments).toHaveLength(5)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject task creation with more than five attachments", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task With Too Many Attachments")
                .field("description", "Testing attachment limit")
                .attach("attachments", Buffer.from("Test file 1"), "test1.txt")
                .attach("attachments", Buffer.from("Test file 2"), "test2.txt")
                .attach("attachments", Buffer.from("Test file 3"), "test3.txt")
                .attach("attachments", Buffer.from("Test file 4"), "test4.txt")
                .attach("attachments", Buffer.from("Test file 5"), "test5.txt")
                .attach("attachments", Buffer.from("Test file 6"), "test6.txt")

            expect(response.statusCode).not.toBe(201)
            expect(response.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject task creation when attachment exceeds file size limit", async () => {
        const testData = await createTestSetup()

        try {
            const largeFile = Buffer.alloc(1 * 1000 * 1000 + 1, "a")

            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task With Large Attachment")
                .field("description", "Testing file size limit")
                .attach("attachments", largeFile, "large-file.txt")

            expect(response.statusCode).not.toBe(201)
            expect(response.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should update task with attachment successfully", async () => {
        const testData = await createTestSetup()

        try {
            const taskResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Original Task")
                .field("description", "Original description")

            expect(taskResponse.statusCode).toBe(201)

            const taskId = taskResponse.body.data._id

            const response = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Updated Task")
                .field("description", "Updated description")
                .attach(
                    "attachments",
                    Buffer.from("Updated attachment"),
                    "updated.txt"
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task updated successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data.title).toBe("Updated Task")
            expect(response.body.data.attachments).toBeDefined()
            expect(response.body.data.attachments).toHaveLength(1)

            expect(response.body.data.attachments[0]).toEqual(
                expect.objectContaining({
                    mimetype: "text/plain",
                    size: expect.any(Number)
                })
            )

            expect(response.body.data.attachments[0].url).toContain(
                "/images/"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should preserve existing attachment when adding another attachment", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task With Existing Attachment")
                .field("description", "Testing attachment update")
                .attach(
                    "attachments",
                    Buffer.from("First attachment"),
                    "first.txt"
                )

            expect(createResponse.statusCode).toBe(201)
            expect(createResponse.body.data.attachments).toHaveLength(1)

            const taskId = createResponse.body.data._id

            const firstAttachmentUrl =
                createResponse.body.data.attachments[0].url

            const updateResponse = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Task With Two Attachments")
                .field("description", "Added another attachment")
                .attach(
                    "attachments",
                    Buffer.from("Second attachment"),
                    "second.txt"
                )

            expect(updateResponse.statusCode).toBe(200)
            expect(updateResponse.body.success).toBe(true)
            expect(updateResponse.body.message).toBe(
                "Task updated successfully"
            )

            expect(updateResponse.body.data.attachments).toHaveLength(2)

            expect(
                updateResponse.body.data.attachments.some(
                    attachment => attachment.url === firstAttachmentUrl
                )
            ).toBe(true)

            expect(
                updateResponse.body.data.attachments.some(
                    attachment =>
                        attachment.mimetype === "text/plain" &&
                        attachment.size > 0 &&
                        attachment.url.includes("/images/")
                )
            ).toBe(true)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should preserve existing attachments when updating task without new attachment", async () => {
        const testData = await createTestSetup()

        try {

            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Original Task")
                .field("description", "Original description")
                .attach(
                    "attachments",
                    Buffer.from("Existing attachment"),
                    "existing.txt"
                )

            expect(createResponse.statusCode).toBe(201)
            expect(createResponse.body.data.attachments).toHaveLength(1)

            const taskId = createResponse.body.data._id
            const originalAttachments =
                createResponse.body.data.attachments

            const updateResponse = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .send({
                    title: "Updated Task",
                    description: "Updated description"
                })

            expect(updateResponse.statusCode).toBe(200)
            expect(updateResponse.body.success).toBe(true)
            expect(updateResponse.body.message).toBe(
                "Task updated successfully"
            )

            expect(updateResponse.body.data.title).toBe("Updated Task")
            expect(updateResponse.body.data.description).toBe(
                "Updated description"
            )

            expect(updateResponse.body.data.attachments).toHaveLength(1)

            expect(updateResponse.body.data.attachments[0].url).toBe(
                originalAttachments[0].url
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should update task with five attachments successfully", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task Before Attachments")
                .field("description", "Testing five attachments on update")

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const updateResponse = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Task With Five Attachments")
                .field("description", "Updated with five files")
                .attach("attachments", Buffer.from("File 1"), "file1.txt")
                .attach("attachments", Buffer.from("File 2"), "file2.txt")
                .attach("attachments", Buffer.from("File 3"), "file3.txt")
                .attach("attachments", Buffer.from("File 4"), "file4.txt")
                .attach("attachments", Buffer.from("File 5"), "file5.txt")

            expect(updateResponse.statusCode).toBe(200)
            expect(updateResponse.body.success).toBe(true)
            expect(updateResponse.body.message).toBe(
                "Task updated successfully"
            )

            expect(updateResponse.body.data.title).toBe(
                "Task With Five Attachments"
            )

            expect(updateResponse.body.data.attachments).toBeDefined()
            expect(updateResponse.body.data.attachments).toHaveLength(5)

            for (const attachment of updateResponse.body.data.attachments) {
                expect(attachment.url).toContain("/images/")
                expect(attachment.mimetype).toBe("text/plain")
                expect(attachment.size).toBeGreaterThan(0)
            }
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject updating task with more than five attachments", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task Before Too Many Attachments")
                .field("description", "Testing update attachment limit")

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const updateResponse = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Task With Too Many Attachments")
                .field("description", "Testing six files")
                .attach("attachments", Buffer.from("File 1"), "file1.txt")
                .attach("attachments", Buffer.from("File 2"), "file2.txt")
                .attach("attachments", Buffer.from("File 3"), "file3.txt")
                .attach("attachments", Buffer.from("File 4"), "file4.txt")
                .attach("attachments", Buffer.from("File 5"), "file5.txt")
                .attach("attachments", Buffer.from("File 6"), "file6.txt")

            expect(updateResponse.statusCode).not.toBe(200)
            expect(updateResponse.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject updating task with attachment exceeding file size limit", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task Before Large Attachment")
                .field("description", "Testing update file size limit")

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const largeFile = Buffer.alloc(
                1 * 1000 * 1000 + 1,
                "a"
            )

            const updateResponse = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Task With Large Attachment")
                .field("description", "Testing large file")
                .attach("attachments", largeFile, "large-file.txt")

            expect(updateResponse.statusCode).not.toBe(200)
            expect(updateResponse.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject attachment with unexpected field name", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task With Wrong Field")
                .field("description", "Testing unexpected file field")
                .attach(
                    "file",
                    Buffer.from("This should be rejected"),
                    "wrong-field.txt"
                )

            expect(response.statusCode).not.toBe(201)
            expect(response.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject task creation with attachment when title is missing", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("description", "Task without title")
                .attach(
                    "attachments",
                    Buffer.from("Test attachment"),
                    "test.txt"
                )

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject task creation with invalid assignedTo and attachment", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task With Invalid Assigned User")
                .field("description", "Testing assignedTo validation")
                .field("assignedTo", "invalid-object-id")
                .attach(
                    "attachments",
                    Buffer.from("Test attachment"),
                    "test.txt"
                )

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject task update with invalid assignedTo and attachment", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Original Task")
                .field("description", "Original description")

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const response = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Updated Task")
                .field("description", "Updated description")
                .field("assignedTo", "invalid-object-id")
                .attach(
                    "attachments",
                    Buffer.from("Test attachment"),
                    "test.txt"
                )

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject task update with invalid status and attachment", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Original Task")
                .field("description", "Original description")

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const response = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Updated Task")
                .field("description", "Updated description")
                .field("status", "invalid_status")
                .attach(
                    "attachments",
                    Buffer.from("Test attachment"),
                    "test.txt"
                )

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should update task with valid status and attachment successfully", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Original Task")
                .field("description", "Original description")

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const response = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Updated Task")
                .field("description", "Updated description")
                .field("status", "in_progress")
                .attach(
                    "attachments",
                    Buffer.from("Status update attachment"),
                    "status.txt"
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task updated successfully"
            )

            expect(response.body.data.title).toBe("Updated Task")
            expect(response.body.data.status).toBe("in_progress")
            expect(response.body.data.attachments).toHaveLength(1)

            expect(response.body.data.attachments[0].url).toContain(
                "/images/"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should update task with valid assignedTo and attachment successfully", async () => {
        const testData = await createTestSetup()
        const assignedUser = await createTestUser()

        await ProjectMember.create({
            user: assignedUser._id,
            project: testData.project._id,
            role: UserRolesEnum.MEMBER
        })

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Original Task")
                .field("description", "Original description")

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const response = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Updated Task")
                .field("description", "Updated description")
                .field("assignedTo", assignedUser._id.toString())
                .attach(
                    "attachments",
                    Buffer.from("Assigned user attachment"),
                    "assigned-user.txt"
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task updated successfully"
            )

            expect(response.body.data.title).toBe("Updated Task")
            expect(response.body.data.attachments).toHaveLength(1)

            expect(response.body.data.assignedTo).toBeDefined()

            expect(response.body.data.assignedTo._id?.toString()).toBe(
                assignedUser._id.toString()
            )
        } finally {
            await ProjectMember.deleteOne({
                user: assignedUser._id,
                project: testData.project._id
            })

            await cleanupTestData(testData)
            await User.findByIdAndDelete(assignedUser._id)
        }
    }, 15000)


    test("should create task with valid status and attachment successfully", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "In Progress Task")
                .field("description", "Task with valid status")
                .field("status", "in_progress")
                .attach(
                    "attachments",
                    Buffer.from("Valid status attachment"),
                    "status.txt"
                )

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Task created successfully"
            )

            expect(response.body.data.status).toBe("in_progress")
            expect(response.body.data.attachments).toHaveLength(1)

            expect(
                response.body.data.attachments[0].url
            ).toContain("/images/")
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should create task with attachment just below 1 MB", async () => {
        const testData = await createTestSetup()

        try {
            const file = Buffer.alloc(
                1 * 1000 * 1000 - 1,
                "a"
            )

            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Just Below 1 MB")
                .field("description", "Testing file size boundary")
                .attach(
                    "attachments",
                    file,
                    "just-below-1mb.txt"
                )

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.data.attachments).toHaveLength(1)

            expect(
                response.body.data.attachments[0].size
            ).toBe(
                1 * 1000 * 1000 - 1
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject task update with unexpected attachment field", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Original Task")
                .field("description", "Original description")

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const response = await testData.agent
                .patch(`/api/v1/tasks/${testData.project._id}/t/${taskId}`)
                .field("title", "Updated Task")
                .field("description", "Updated description")
                .attach(
                    "file",
                    Buffer.from("Wrong field attachment"),
                    "wrong-field.txt"
                )

            expect(response.statusCode).not.toBe(200)
            expect(response.body.success).toBe(false)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)


    test("should delete attachment file from filesystem when task is deleted", async () => {
        const testData = await createTestSetup()

        try {
            const createResponse = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .field("title", "Task For Attachment Deletion")
                .field("description", "Testing physical file deletion")
                .attach(
                    "attachments",
                    Buffer.from("File to be deleted"),
                    "delete-me.txt"
                )

            expect(createResponse.statusCode).toBe(201)

            const taskId = createResponse.body.data._id

            const attachmentUrl =
                createResponse.body.data.attachments[0].url

            const fileName =
                attachmentUrl.split("/images/")[1]

            const filePath = path.join(
                process.cwd(),
                "public",
                "images",
                fileName
            )

            await expect(
                fs.access(filePath)
            ).resolves.toBeUndefined()

            const deleteResponse = await testData.agent
                .delete(
                    `/api/v1/tasks/${testData.project._id}/t/${taskId}`
                )

            expect(deleteResponse.statusCode).toBe(200)
            expect(deleteResponse.body.success).toBe(true)
            expect(deleteResponse.body.message).toBe(
                "Task deleted successfully"
            )

            const deletedTask =
                await Task.findById(taskId)

            expect(deletedTask).toBeNull()

            await expect(
                fs.access(filePath)
            ).rejects.toThrow()
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)
})