import "dotenv/config"
import mongoose from "mongoose"
import request from "supertest"

import app from "../src/app.js"

import { Note } from "../src/models/notes.models.js"
import { ProjectMember } from "../src/models/projectmembers.models.js"

import { UserRolesEnum } from "../src/utils/constants.js"

import {
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


describe("Notes API", () => {

    test("should reject create note without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .post(`/api/v1/notes/${fakeProjectId}`)
            .send({
                title: "Test Note",
                content: "Test note content"
            })

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should reject create note without title", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/notes/${testData.project._id}`)
                .send({
                    content: "Note without title"
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
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create note without content", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/notes/${testData.project._id}`)
                .send({
                    title: "Note without content"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Recieved data is not valid"
            )

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        content: "Content is required"
                    })
                ])
            )
        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create note when requester is a member", async () => {
        const testData = await createTestSetup({
            role: UserRolesEnum.MEMBER
        })

        try {
            const response = await testData.agent
                .post(`/api/v1/notes/${testData.project._id}`)
                .send({
                    title: "Member Note",
                    content: "Member should not create note"
                })

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )
        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create note when requester is a project admin", async () => {
        const testData = await createTestSetup({
            role: UserRolesEnum.PROJECT_ADMIN
        })

        try {
            const response = await testData.agent
                .post(`/api/v1/notes/${testData.project._id}`)
                .send({
                    title: "Project Admin Note",
                    content: "Project admin should not create note"
                })

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )
        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject create note when requester is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const response = await nonMemberData.agent
                .post(`/api/v1/notes/${ownerData.project._id}`)
                .send({
                    title: "Non Member Note",
                    content: "Non member should not create note"
                })

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )
        } finally {
            await Note.deleteMany({
                project: ownerData.project._id
            })

            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should create note successfully", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(`/api/v1/notes/${testData.project._id}`)
                .send({
                    title: "Test Note",
                    content: "This is a test note"
                })

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Note created successfully"
            )

            expect(response.body.data).toBeDefined()

            expect(response.body.data.title).toBe(
                "Test Note"
            )

            expect(response.body.data.content).toBe(
                "This is a test note"
            )

            expect(response.body.data.project).toBe(
                testData.project._id
            )

            expect(response.body.data.createdBy).toBe(
                testData.user._id.toString()
            )

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject get notes without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .get(`/api/v1/notes/${fakeProjectId}`)

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should get notes successfully", async () => {
        const testData = await createTestSetup()

        try {
            await Note.create({
                title: "First Note",
                content: "First note content",
                project: testData.project._id,
                createdBy: testData.user._id
            })

            await Note.create({
                title: "Second Note",
                content: "Second note content",
                project: testData.project._id,
                createdBy: testData.user._id
            })

            const response = await testData.agent
                .get(`/api/v1/notes/${testData.project._id}`)

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Notes fetched successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data.length).toBe(2)

            expect(
                response.body.data.some(
                    note => note.title === "First Note"
                )
            ).toBe(true)

            expect(
                response.body.data.some(
                    note => note.title === "Second Note"
                )
            ).toBe(true)

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should allow project member to get notes", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await Note.create({
                title: "Member Read Note",
                content: "Member can read this note",
                project: ownerData.project._id,
                createdBy: ownerData.user._id
            })

            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .get(`/api/v1/notes/${ownerData.project._id}`)

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data).toBeDefined()
            expect(response.body.data.length).toBe(1)
            expect(response.body.data[0].title).toBe(
                "Member Read Note"
            )

        } finally {
            await Note.deleteMany({
                project: ownerData.project._id
            })

            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)


    test("should reject get notes when user is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const response = await nonMemberData.agent
                .get(`/api/v1/notes/${ownerData.project._id}`)

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )

        } finally {
            await Note.deleteMany({
                project: ownerData.project._id
            })

            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should reject get note by id without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()
        const fakeNoteId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .get(
                `/api/v1/notes/${fakeProjectId}/n/${fakeNoteId}`
            )

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should get note by id successfully", async () => {
        const testData = await createTestSetup()

        try {
            const note = await Note.create({
                title: "Single Note",
                content: "Single note content",
                project: testData.project._id,
                createdBy: testData.user._id
            })

            const response = await testData.agent
                .get(
                    `/api/v1/notes/${testData.project._id}/n/${note._id}`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Note fetched successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data._id).toBe(
                note._id.toString()
            )

            expect(response.body.data.title).toBe(
                "Single Note"
            )

            expect(response.body.data.content).toBe(
                "Single note content"
            )

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject get note by id when note does not exist", async () => {
        const testData = await createTestSetup()
        const fakeNoteId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .get(
                    `/api/v1/notes/${testData.project._id}/n/${fakeNoteId}`
                )

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Note not found"
            )

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject update note without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()
        const fakeNoteId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .put(
                `/api/v1/notes/${fakeProjectId}/n/${fakeNoteId}`
            )
            .send({
                title: "Updated Note",
                content: "Updated content"
            })

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should reject update note when requester is a member", async () => {
        const testData = await createTestSetup({
            role: UserRolesEnum.MEMBER
        })

        try {
            const note = await Note.create({
                title: "Original Note",
                content: "Original content",
                project: testData.project._id,
                createdBy: testData.user._id
            })

            const response = await testData.agent
                .put(
                    `/api/v1/notes/${testData.project._id}/n/${note._id}`
                )
                .send({
                    title: "Changed By Member",
                    content: "Member should not update"
                })

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject update note when requester is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const note = await Note.create({
                title: "Private Note",
                content: "Private content",
                project: ownerData.project._id,
                createdBy: ownerData.user._id
            })

            const response = await nonMemberData.agent
                .put(
                    `/api/v1/notes/${ownerData.project._id}/n/${note._id}`
                )
                .send({
                    title: "Changed",
                    content: "Changed content"
                })

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )

        } finally {
            await Note.deleteMany({
                project: ownerData.project._id
            })

            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should reject update note when note does not exist", async () => {
        const testData = await createTestSetup()
        const fakeNoteId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .put(
                    `/api/v1/notes/${testData.project._id}/n/${fakeNoteId}`
                )
                .send({
                    title: "Updated Note",
                    content: "Updated content"
                })

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Note not found"
            )

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should update note successfully", async () => {
        const testData = await createTestSetup()

        try {
            const note = await Note.create({
                title: "Original Note",
                content: "Original content",
                project: testData.project._id,
                createdBy: testData.user._id
            })

            const response = await testData.agent
                .put(
                    `/api/v1/notes/${testData.project._id}/n/${note._id}`
                )
                .send({
                    title: "Updated Note",
                    content: "Updated content"
                })

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Note updated successfully"
            )

            expect(response.body.data.title).toBe(
                "Updated Note"
            )

            expect(response.body.data.content).toBe(
                "Updated content"
            )

            const updatedNote = await Note.findById(
                note._id
            )

            expect(updatedNote).toBeDefined()
            expect(updatedNote.title).toBe(
                "Updated Note"
            )
            expect(updatedNote.content).toBe(
                "Updated content"
            )

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject delete note without authentication", async () => {
        const fakeProjectId = new mongoose.Types.ObjectId()
        const fakeNoteId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .delete(
                `/api/v1/notes/${fakeProjectId}/n/${fakeNoteId}`
            )

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    }, 15000)


    test("should reject delete note when requester is a member", async () => {
        const testData = await createTestSetup({
            role: UserRolesEnum.MEMBER
        })

        try {
            const note = await Note.create({
                title: "Delete Permission Note",
                content: "Member should not delete this",
                project: testData.project._id,
                createdBy: testData.user._id
            })

            const response = await testData.agent
                .delete(
                    `/api/v1/notes/${testData.project._id}/n/${note._id}`
                )

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should reject delete note when requester is not a project member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const note = await Note.create({
                title: "Private Delete Note",
                content: "Non member should not delete this",
                project: ownerData.project._id,
                createdBy: ownerData.user._id
            })

            const response = await nonMemberData.agent
                .delete(
                    `/api/v1/notes/${ownerData.project._id}/n/${note._id}`
                )

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )

        } finally {
            await Note.deleteMany({
                project: ownerData.project._id
            })

            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)


    test("should reject delete note when note does not exist", async () => {
        const testData = await createTestSetup()
        const fakeNoteId = new mongoose.Types.ObjectId()

        try {
            const response = await testData.agent
                .delete(
                    `/api/v1/notes/${testData.project._id}/n/${fakeNoteId}`
                )

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Note not found"
            )

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)


    test("should delete note successfully", async () => {
        const testData = await createTestSetup()

        try {
            const note = await Note.create({
                title: "Note To Delete",
                content: "Delete this note",
                project: testData.project._id,
                createdBy: testData.user._id
            })

            const response = await testData.agent
                .delete(
                    `/api/v1/notes/${testData.project._id}/n/${note._id}`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Note deleted successfully"
            )

            const deletedNote = await Note.findById(
                note._id
            )

            expect(deletedNote).toBeNull()

        } finally {
            await Note.deleteMany({
                project: testData.project._id
            })

            await cleanupTestData(testData)
        }
    }, 15000)

})