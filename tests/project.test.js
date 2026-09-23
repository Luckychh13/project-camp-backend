import "dotenv/config"
import mongoose from "mongoose"
import request from "supertest"
import app from "../src/app.js"

import { Project } from "../src/models/project.models.js"
import { ProjectMember } from "../src/models/projectmembers.models.js"
import { UserRolesEnum } from "../src/utils/constants.js"

import {
    createTestAuthSetup,
    createTestProject,
    createTestSetup,
    cleanupTestData
} from "./helpers/testSetup.js"

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI)
})

afterAll(async () => {
    await mongoose.connection.close()
})

describe("Project API", () => {

    test("should reject create project without authentication", async () => {
        const response = await request(app)
            .post("/api/v1/projects")
            .send({
                name: "Test Project"
            })

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    })

    test("should reject create project without project name", async () => {
        const authData = await createTestAuthSetup()
        try {
            const response = await authData.agent
                .post("/api/v1/projects")
                .send({
                    description: "Test project description"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Recieved data is not valid"
            )

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: "Name is required"
                    })
                ])
            )
        } finally {
            await cleanupTestData(authData)
        }
    }, 15000)

    test("should create project successfully", async () => {
        const authData = await createTestAuthSetup()
        let project

        try {
            project = await createTestProject(authData.agent, {
                name: `Test Project ${Date.now()}`,
                description: "Test project description"
            })

            expect(project).toBeDefined()
            expect(project.name).toBeDefined()
            expect(project.description).toBe(
                "Test project description"
            )

            expect(project.createdBy.toString()).toBe(
                authData.user._id.toString()
            )

            const createdProject = await Project.findById(
                project._id
            )

            expect(createdProject).toBeDefined()
            expect(createdProject.name).toBe(project.name)
        } finally {
            await cleanupTestData({
                user: authData.user,
                project
            })
        }
    }, 15000)

    test("should reject get projects without authentication", async () => {
        const response = await request(app)
            .get("/api/v1/projects/")

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    })

    test("should get projects successfully", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .get("/api/v1/projects/")

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Projects fetched successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data.length).toBeGreaterThan(0)

            expect(response.body.data[0].project.name).toBe(
                testData.project.name
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)

    test("should reject get project by id without authentication", async () => {
        const response = await request(app)
            .get(
                "/api/v1/projects/507f1f77bcf86cd799439011"
            )

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    })

    test("should get project by id successfully", async () => {
        const testData = await createTestSetup({
            projectOverrides: {
                name: `Single Project ${Date.now()}`,
                description: "Project for get by id test"
            }
        })

        try {
            const response = await testData.agent
                .get(
                    `/api/v1/projects/${testData.project._id}`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Prioject fetched successfully"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data._id).toBe(
                testData.project._id
            )
            expect(response.body.data.name).toBe(
                testData.project.name
            )
            expect(response.body.data.description).toBe(
                testData.project.description
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)

    test("should reject get project by id when user is not a member", async () => {
        const ownerData = await createTestSetup()
        const otherUserData = await createTestAuthSetup()

        try {
            const response = await otherUserData.agent
                .get(
                    `/api/v1/projects/${ownerData.project._id}`
                )

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You are not a member of this project"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(otherUserData)
        }
    }, 15000)

    test("should update project successfully", async () => {
        const testData = await createTestSetup({
            projectOverrides: {
                name: `Old Project Name ${Date.now()}`,
                description: "Old description"
            }
        })

        try {
            const response = await testData.agent
                .put(
                    `/api/v1/projects/${testData.project._id}`
                )
                .send({
                    name: "Updated Project Name",
                    description: "Updated description"
                })

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Project updated successfully"
            )

            expect(response.body.data.name).toBe(
                "Updated Project Name"
            )
            expect(response.body.data.description).toBe(
                "Updated description"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)

    test("should reject update project when user is not an admin", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .put(
                    `/api/v1/projects/${ownerData.project._id}`
                )
                .send({
                    name: "Hacked Project",
                    description: "Changed by member"
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

    test("should delete project successfully", async () => {
        const testData = await createTestSetup({
            projectOverrides: {
                name: `Project To Delete ${Date.now()}`,
                description: "Project for delete test"
            }
        })

        try {
            const response = await testData.agent
                .delete(
                    `/api/v1/projects/${testData.project._id}`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Project deleted successfully"
            )

            const deletedProject = await Project.findById(
                testData.project._id
            )

            expect(deletedProject).toBeNull()

            const remainingMembers = await ProjectMember.find({
                project: testData.project._id
            })

            expect(remainingMembers).toHaveLength(0)
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)

    test("should reject delete project when user is not an admin", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .delete(
                    `/api/v1/projects/${ownerData.project._id}`
                )

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )

            const existingProject = await Project.findById(
                ownerData.project._id
            )

            expect(existingProject).not.toBeNull()
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)

    test("should reject get project members without authentication", async () => {
        const response = await request(app)
            .get(
                "/api/v1/projects/507f1f77bcf86cd799439011/members"
            )

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe(
            "Unauthorized request"
        )
    })

    test("should get project members successfully", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await ownerData.agent
                .get(
                    `/api/v1/projects/${ownerData.project._id}/members`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Project members fetched"
            )

            expect(response.body.data).toBeDefined()
            expect(response.body.data.length).toBe(2)

            expect(
                response.body.data.some(
                    item =>
                        item.user.username ===
                        ownerData.user.username
                )
            ).toBe(true)

            expect(
                response.body.data.some(
                    item =>
                        item.user.username ===
                        memberData.user.username
                )
            ).toBe(true)
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)

    test("should add member to project successfully", async () => {
        const ownerData = await createTestSetup()
        const newMemberData = await createTestAuthSetup()

        try {
            const response = await ownerData.agent
                .post(
                    `/api/v1/projects/${ownerData.project._id}/members`
                )
                .send({
                    email: newMemberData.user.email,
                    role: UserRolesEnum.MEMBER
                })

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Added project member role"
            )

            const projectMember = await ProjectMember.findOne({
                project: ownerData.project._id,
                user: newMemberData.user._id
            })

            expect(projectMember).toBeDefined()
            expect(projectMember.role).toBe(
                UserRolesEnum.MEMBER
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(newMemberData)
        }
    }, 15000)

    test("should reject adding member with invalid role", async () => {
        const ownerData = await createTestSetup()
        const newMemberData = await createTestAuthSetup()

        try {
            const response = await ownerData.agent
                .post(
                    `/api/v1/projects/${ownerData.project._id}/members`
                )
                .send({
                    email: newMemberData.user.email,
                    role: "manager"
                })

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: "Role is invalid"
                    })
                ])
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(newMemberData)
        }
    }, 15000)

    test("should reject adding member when user does not exist", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(
                    `/api/v1/projects/${testData.project._id}/members`
                )
                .send({
                    email: "doesnotexist@gmail.com",
                    role: UserRolesEnum.MEMBER
                })

            expect(response.statusCode).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "User doesnot exits"
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)

    test("should update project member role successfully", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await ownerData.agent
                .put(
                    `/api/v1/projects/${ownerData.project._id}/members/${memberData.user._id}`
                )
                .send({
                    newRole: UserRolesEnum.PROJECT_ADMIN
                })

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Project member role updated successfully"
            )

            expect(response.body.data.role).toBe(
                UserRolesEnum.PROJECT_ADMIN
            )

            const updatedMember = await ProjectMember.findOne({
                project: ownerData.project._id,
                user: memberData.user._id
            })

            expect(updatedMember.role).toBe(
                UserRolesEnum.PROJECT_ADMIN
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)

    test("should reject updating member with invalid role", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await ownerData.agent
                .put(
                    `/api/v1/projects/${ownerData.project._id}/members/${memberData.user._id}`
                )
                .send({
                    newRole: "manager"
                })

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Invalid role"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)

    test("should reject role update when project member does not exist", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const response = await ownerData.agent
                .put(
                    `/api/v1/projects/${ownerData.project._id}/members/${nonMemberData.user._id}`
                )
                .send({
                    newRole: UserRolesEnum.PROJECT_ADMIN
                })

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Project member not found"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)

    test("should delete project member successfully", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await ownerData.agent
                .delete(
                    `/api/v1/projects/${ownerData.project._id}/members/${memberData.user._id}`
                )

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toBe(
                "Project member deleted successfully"
            )

            const deletedMember = await ProjectMember.findOne({
                project: ownerData.project._id,
                user: memberData.user._id
            })

            expect(deletedMember).toBeNull()
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)

    test("should reject deleting project member when member does not exist", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const response = await ownerData.agent
                .delete(
                    `/api/v1/projects/${ownerData.project._id}/members/${nonMemberData.user._id}`
                )

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Project member not found"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(nonMemberData)
        }
    }, 15000)

    test("should reject adding member when requester is not an admin", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()
        const newUserData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .post(
                    `/api/v1/projects/${ownerData.project._id}/members`
                )
                .send({
                    email: newUserData.user.email,
                    role: UserRolesEnum.MEMBER
                })

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )

            const projectMember = await ProjectMember.findOne({
                project: ownerData.project._id,
                user: newUserData.user._id
            })

            expect(projectMember).toBeNull()
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
            await cleanupTestData(newUserData)
        }
    }, 15000)

    test("should reject get project members when user is not a member", async () => {
        const ownerData = await createTestSetup()
        const nonMemberData = await createTestAuthSetup()

        try {
            const response = await nonMemberData.agent
                .get(
                    `/api/v1/projects/${ownerData.project._id}/members`
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

    test("should reject deleting member when requester is not an admin", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()
        const targetMemberData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            await ProjectMember.create({
                user: targetMemberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await memberData.agent
                .delete(
                    `/api/v1/projects/${ownerData.project._id}/members/${targetMemberData.user._id}`
                )

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            )

            const existingMember = await ProjectMember.findOne({
                project: ownerData.project._id,
                user: targetMemberData.user._id
            })

            expect(existingMember).not.toBeNull()
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
            await cleanupTestData(targetMemberData)
        }
    }, 15000)

    test("should reject adding member without email and role", async () => {
        const testData = await createTestSetup()

        try {
            const response = await testData.agent
                .post(
                    `/api/v1/projects/${testData.project._id}/members`
                )
                .send({})

            expect(response.statusCode).toBe(422)
            expect(response.body.success).toBe(false)

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        email: "Email is required"
                    }),
                    expect.objectContaining({
                        role: "Role is required"
                    })
                ])
            )
        } finally {
            await cleanupTestData(testData)
        }
    }, 15000)

    test("should reject updating member without new role", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER
            })

            const response = await ownerData.agent
                .put(
                    `/api/v1/projects/${ownerData.project._id}/members/${memberData.user._id}`
                )
                .send({})

            expect(response.statusCode).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe(
                "Invalid role"
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)

    test("should update role when adding an existing project member", async () => {
        const ownerData = await createTestSetup()
        const memberData = await createTestAuthSetup()

        try {
            await ownerData.agent
                .post(
                    `/api/v1/projects/${ownerData.project._id}/members`
                )
                .send({
                    email: memberData.user.email,
                    role: UserRolesEnum.MEMBER
                })

            const response = await ownerData.agent
                .post(
                    `/api/v1/projects/${ownerData.project._id}/members`
                )
                .send({
                    email: memberData.user.email,
                    role: UserRolesEnum.PROJECT_ADMIN
                })

            expect(response.statusCode).toBe(201)
            expect(response.body.success).toBe(true)

            const members = await ProjectMember.find({
                project: ownerData.project._id,
                user: memberData.user._id
            })

            expect(members).toHaveLength(1)
            expect(members[0].role).toBe(
                UserRolesEnum.PROJECT_ADMIN
            )
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(memberData)
        }
    }, 15000)
})