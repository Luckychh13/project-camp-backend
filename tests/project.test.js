import "dotenv/config"
import mongoose from "mongoose"
import request from "supertest"
import app from "../src/app.js"

import { Project } from "../src/models/project.models.js"
import { ProjectMember } from "../src/models/projectmembers.models.js"
import { UserRolesEnum, AvailableUserRole } from "../src/utils/constants.js"

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
            expect(response.body.data).toBeDefined();

            const { projects, pagination } = response.body.data;

            expect(Array.isArray(projects)).toBe(true);
            expect(projects.length).toBeGreaterThan(0);

            expect(projects[0].project.name).toBe(
                testData.project.name
            );

            expect(pagination.currentPage).toBe(1);
            expect(pagination.limit).toBe(10);
            expect(pagination.totalProjects).toBeGreaterThanOrEqual(
                projects.length
            );

            expect(pagination.totalPages).toBe(
                Math.ceil(pagination.totalProjects / pagination.limit)
            );

            expect(pagination.hasNextPage).toBe(
                pagination.currentPage < pagination.totalPages
            );

            expect(pagination.nextPage).toBe(
                pagination.hasNextPage ? pagination.currentPage + 1 : null
            );

            expect(pagination.hasPreviousPage).toBe(false);
            expect(pagination.previousPage).toBe(null);
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

            expect(response.statusCode).toBe(403)
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

            const { members, pagination } = response.body.data;

            expect(Array.isArray(members)).toBe(true);
            expect(members).toHaveLength(2);

            expect(
                members.some(
                    item =>
                        item.user.username ===
                        ownerData.user.username
                )
            ).toBe(true)

            expect(
                members.some(
                    item =>
                        item.user.username ===
                        memberData.user.username
                )
            ).toBe(true)

            expect(pagination).toEqual({
                currentPage: 1,
                limit: 10,
                totalMembers: 2,
                totalPages: 1,
                hasNextPage: false,
                nextPage: null,
                hasPreviousPage: false,
                previousPage: null,
            });
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

            expect(response.statusCode).toBe(404)
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

            expect(response.statusCode).toBe(403)
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

            expect(response.statusCode).toBe(200)
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

    test("should reject demoting the last project admin", async () => {
        const ownerData = await createTestSetup()

        try {
            const response = await ownerData.agent
                .put(
                    `/api/v1/projects/${ownerData.project._id}/members/${ownerData.user._id}`
                )
                .send({
                    newRole: UserRolesEnum.MEMBER
                })

            expect(response.statusCode).toBe(409)
            expect(response.body.message).toBe(
                "A project must have at least one admin"
            )

            const membership = await ProjectMember.findOne({
                project: ownerData.project._id,
                user: ownerData.user._id
            })

            expect(membership.role).toBe(UserRolesEnum.ADMIN)
        } finally {
            await cleanupTestData(ownerData)
        }
    }, 15000)

    test("should reject deleting the last project admin", async () => {
        const ownerData = await createTestSetup()

        try {
            const response = await ownerData.agent
                .delete(
                    `/api/v1/projects/${ownerData.project._id}/members/${ownerData.user._id}`
                )

            expect(response.statusCode).toBe(409)
            expect(response.body.message).toBe(
                "A project must have at least one admin"
            )

            const membership = await ProjectMember.findOne({
                project: ownerData.project._id,
                user: ownerData.user._id
            })

            expect(membership).not.toBeNull()
            expect(membership.role).toBe(UserRolesEnum.ADMIN)
        } finally {
            await cleanupTestData(ownerData)
        }
    }, 15000)

    test("should reject demoting the last admin through add-member endpoint", async () => {
        const ownerData = await createTestSetup()

        try {
            const response = await ownerData.agent
                .post(
                    `/api/v1/projects/${ownerData.project._id}/members`
                )
                .send({
                    email: ownerData.user.email,
                    role: UserRolesEnum.MEMBER
                })

            expect(response.statusCode).toBe(409)
            expect(response.body.message).toBe(
                "A project must have at least one admin"
            )

            const membership = await ProjectMember.findOne({
                project: ownerData.project._id,
                user: ownerData.user._id
            })

            expect(membership.role).toBe(UserRolesEnum.ADMIN)
        } finally {
            await cleanupTestData(ownerData)
        }
    }, 15000)

    test("should allow demoting an admin when another admin exists", async () => {
        const ownerData = await createTestSetup()
        const secondAdmin = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: secondAdmin.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.ADMIN
            })

            const response = await ownerData.agent
                .put(
                    `/api/v1/projects/${ownerData.project._id}/members/${secondAdmin.user._id}`
                )
                .send({
                    newRole: UserRolesEnum.MEMBER
                })

            expect(response.statusCode).toBe(200)

            const updatedMembership = await ProjectMember.findOne({
                user: secondAdmin.user._id,
                project: ownerData.project._id
            })

            expect(updatedMembership.role).toBe(UserRolesEnum.MEMBER)

            const remainingAdmin = await ProjectMember.findOne({
                user: ownerData.user._id,
                project: ownerData.project._id
            })

            expect(remainingAdmin.role).toBe(UserRolesEnum.ADMIN)
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(secondAdmin)
        }
    }, 15000)

    test("should allow deleting an admin when another admin exists", async () => {
        const ownerData = await createTestSetup()
        const secondAdmin = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: secondAdmin.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.ADMIN
            })

            const response = await ownerData.agent
                .delete(
                    `/api/v1/projects/${ownerData.project._id}/members/${secondAdmin.user._id}`
                )

            expect(response.statusCode).toBe(200)

            const deletedMembership = await ProjectMember.findOne({
                user: secondAdmin.user._id,
                project: ownerData.project._id
            })

            expect(deletedMembership).toBeNull()

            const remainingAdmin = await ProjectMember.findOne({
                user: ownerData.user._id,
                project: ownerData.project._id
            })

            expect(remainingAdmin.role).toBe(UserRolesEnum.ADMIN)
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(secondAdmin)
        }
    }, 15000)

    test("should allow demoting an admin through add-member endpoint when another admin exists", async () => {
        const ownerData = await createTestSetup()
        const secondAdmin = await createTestAuthSetup()

        try {
            await ProjectMember.create({
                user: secondAdmin.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.ADMIN
            })

            const response = await ownerData.agent
                .post(
                    `/api/v1/projects/${ownerData.project._id}/members`
                )
                .send({
                    email: ownerData.user.email,
                    role: UserRolesEnum.MEMBER
                })

            expect(response.statusCode).toBe(200)
            expect(response.body.success).toBe(true)

            const updatedOwnerMembership = await ProjectMember.findOne({
                user: ownerData.user._id,
                project: ownerData.project._id
            })

            expect(updatedOwnerMembership.role).toBe(
                UserRolesEnum.MEMBER
            )

            const remainingAdmin = await ProjectMember.findOne({
                user: secondAdmin.user._id,
                project: ownerData.project._id
            })

            expect(remainingAdmin.role).toBe(UserRolesEnum.ADMIN)
        } finally {
            await cleanupTestData(ownerData)
            await cleanupTestData(secondAdmin)
        }
    }, 15000)

    test("should paginate project members and return correct navigation metadata", async () => {
        const ownerData = await createTestSetup();
        const memberOne = await createTestAuthSetup();
        const memberTwo = await createTestAuthSetup();

        try {
            await ProjectMember.create({
                user: memberOne.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER,
            });

            await ProjectMember.create({
                user: memberTwo.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER,
            });

            const firstResponse = await ownerData.agent.get(
                `/api/v1/projects/${ownerData.project._id}/members?page=1&limit=2`
            );

            expect(firstResponse.statusCode).toBe(200);

            const {
                members: firstMembers,
                pagination: firstPagination,
            } = firstResponse.body.data;

            expect(firstMembers).toHaveLength(2);

            expect(firstPagination).toMatchObject({
                currentPage: 1,
                limit: 2,
                totalMembers: 3,
                totalPages: 2,
                hasNextPage: true,
                nextPage: 2,
                hasPreviousPage: false,
                previousPage: null,
            });

            const secondResponse = await ownerData.agent.get(
                `/api/v1/projects/${ownerData.project._id}/members?page=2&limit=2`
            );

            expect(secondResponse.statusCode).toBe(200);

            const {
                members: secondMembers,
                pagination: secondPagination,
            } = secondResponse.body.data;

            expect(secondMembers).toHaveLength(1);

            expect(secondPagination).toMatchObject({
                currentPage: 2,
                limit: 2,
                totalMembers: 3,
                totalPages: 2,
                hasNextPage: false,
                nextPage: null,
                hasPreviousPage: true,
                previousPage: 1,
            });

            const returnedUserIds = [
                ...firstMembers,
                ...secondMembers,
            ]
                .map(member => member.user._id)
                .sort();

            const expectedUserIds = [
                ownerData.user._id.toString(),
                memberOne.user._id.toString(),
                memberTwo.user._id.toString(),
            ].sort();

            expect(returnedUserIds).toEqual(expectedUserIds);
        } finally {
            await cleanupTestData(ownerData);
            await cleanupTestData(memberOne);
            await cleanupTestData(memberTwo);
        }
    }, 30000);

    test("should paginate user projects and return correct navigation metadata", async () => {
        const testData = await createTestSetup();
        const extraProjects = [];

        try {
            const projectNames = [
                `Pagination Project B ${testData.user._id}`,
                `Pagination Project C ${testData.user._id}`,
            ];

            for (const name of projectNames) {
                const project = await Project.create({
                    name,
                    description: "Pagination integration test",
                    createdBy: testData.user._id,
                });

                extraProjects.push(project);

                await ProjectMember.create({
                    user: testData.user._id,
                    project: project._id,
                    role: UserRolesEnum.ADMIN,
                });
            }

            const expectedNames = [
                testData.project.name,
                ...extraProjects.map(project => project.name),
            ].sort();

            const firstResponse = await testData.agent.get(
                "/api/v1/projects?page=1&limit=2"
            );

            expect(firstResponse.statusCode).toBe(200);

            const {
                projects: firstProjects,
                pagination: firstPagination,
            } = firstResponse.body.data;

            expect(firstProjects).toHaveLength(2);

            expect(firstPagination).toMatchObject({
                currentPage: 1,
                limit: 2,
                totalProjects: 3,
                totalPages: 2,
                hasNextPage: true,
                nextPage: 2,
                hasPreviousPage: false,
                previousPage: null,
            });

            const secondResponse = await testData.agent.get(
                "/api/v1/projects?page=2&limit=2"
            );

            expect(secondResponse.statusCode).toBe(200);

            const {
                projects: secondProjects,
                pagination: secondPagination,
            } = secondResponse.body.data;

            expect(secondProjects).toHaveLength(1);

            expect(secondPagination).toMatchObject({
                currentPage: 2,
                limit: 2,
                totalProjects: 3,
                totalPages: 2,
                hasNextPage: false,
                nextPage: null,
                hasPreviousPage: true,
                previousPage: 1,
            });

            const returnedNames = [
                ...firstProjects,
                ...secondProjects,
            ]
                .map(item => item.project.name)
                .sort();

            expect(returnedNames).toEqual(expectedNames);
        } finally {
            if (extraProjects.length > 0) {
                const extraProjectIds = extraProjects.map(
                    project => project._id
                );

                await ProjectMember.deleteMany({
                    project: { $in: extraProjectIds },
                });

                await Project.deleteMany({
                    _id: { $in: extraProjectIds },
                });
            }

            await cleanupTestData(testData);
        }
    }, 30000);

    test("should sort projects by name in ascending order", async () => {
        const testData = await createTestSetup();
        let createdProjects = [];

        try {
            const prefix = `sort-${Date.now()}`;

            const names = [
                `${prefix}-C`,
                `${prefix}-A`,
                `${prefix}-B`,
            ];

            createdProjects = await Project.create(
                names.map((name) => ({
                    name,
                    description: "Sorting integration test",
                    createdBy: testData.user._id,
                }))
            );

            await ProjectMember.insertMany(
                createdProjects.map((project) => ({
                    user: testData.user._id,
                    project: project._id,
                    role: UserRolesEnum.MEMBER,
                }))
            );

            const response = await testData.agent.get(
                "/api/v1/projects?sortBy=name&order=asc&limit=100"
            );

            expect(response.statusCode).toBe(200);

            const returnedNames = response.body.data.projects
                .map((item) => item.project.name)
                .filter((name) => names.includes(name));

            expect(returnedNames).toEqual([
                `${prefix}-A`,
                `${prefix}-B`,
                `${prefix}-C`,
            ]);
        } finally {
            const projectIds = createdProjects.map(
                (project) => project._id
            );

            if (projectIds.length > 0) {
                await ProjectMember.deleteMany({
                    project: { $in: projectIds },
                });

                await Project.deleteMany({
                    _id: { $in: projectIds },
                });
            }

            await cleanupTestData(testData);
        }
    }, 15000);

    test("should reject unsupported project sort fields", async () => {
        const testData = await createTestSetup();

        try {
            const response = await testData.agent.get(
                "/api/v1/projects?sortBy=password&order=desc"
            );

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Invalid sort field");
        } finally {
            await cleanupTestData(testData);
        }
    }, 15000);

    test("should sort project members by role in ascending order", async () => {
        const ownerData = await createTestSetup();
        const memberData = await createTestAuthSetup();

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER,
            });

            const response = await ownerData.agent.get(
                `/api/v1/projects/${ownerData.project._id}/members?sortBy=role&order=asc`
            );

            expect(response.statusCode).toBe(200);

            const { members } = response.body.data;
            const roles = members.map((member) => member.role);

            expect(roles).toEqual([...roles].sort());
            expect(roles).toContain(UserRolesEnum.MEMBER);
        } finally {
            await cleanupTestData(ownerData);
            await cleanupTestData(memberData);
        }
    }, 15000);

    test("should reject unsupported project member sort fields", async () => {
        const testData = await createTestSetup();

        try {
            const response = await testData.agent.get(
                `/api/v1/projects/${testData.project._id}/members?sortBy=password&order=desc`
            );

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Invalid sort field");
        } finally {
            await cleanupTestData(testData);
        }
    }, 15000);

    test("should filter projects by user role", async () => {
        const testData = await createTestSetup();
        let createdProject;

        try {
            const existingMembership = await ProjectMember.findOne({
                user: testData.user._id,
                project: testData.project._id,
            });

            expect(existingMembership).not.toBeNull();

            const targetRole = AvailableUserRole.find(
                (role) => role !== existingMembership.role
            );

            expect(targetRole).toBeDefined();

            createdProject = await Project.create({
                name: `filter-role-${Date.now()}`,
                description: "Role filtering test",
                createdBy: testData.user._id,
            });

            await ProjectMember.create({
                user: testData.user._id,
                project: createdProject._id,
                role: targetRole,
            });

            const response = await testData.agent.get(
                `/api/v1/projects?role=${encodeURIComponent(targetRole)}`
            );

            expect(response.statusCode).toBe(200);

            const { projects, pagination } = response.body.data;

            expect(projects).toHaveLength(1);
            expect(projects[0].project._id).toBe(
                createdProject._id.toString()
            );
            expect(projects[0].role).toBe(targetRole);
            expect(pagination.totalProjects).toBe(1);
        } finally {
            if (createdProject) {
                await ProjectMember.deleteMany({
                    project: createdProject._id,
                });

                await Project.deleteOne({
                    _id: createdProject._id,
                });
            }

            await cleanupTestData(testData);
        }
    }, 15000);

    test("should reject an invalid project role filter", async () => {
        const testData = await createTestSetup();

        try {
            const response = await testData.agent.get(
                "/api/v1/projects?role=INVALID_ROLE"
            );

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Invalid project role");
        } finally {
            await cleanupTestData(testData);
        }
    }, 15000);

    test("should filter project members by role", async () => {
        const ownerData = await createTestSetup();
        const memberData = await createTestAuthSetup();
        let createdMembership;

        try {
            const existingMemberships = await ProjectMember.find({
                project: ownerData.project._id,
            }).select("role").lean();

            const existingRoles = new Set(
                existingMemberships.map((membership) => membership.role)
            );

            const targetRole = AvailableUserRole.find(
                (role) => !existingRoles.has(role)
            );

            expect(targetRole).toBeDefined();

            createdMembership = await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: targetRole,
            });

            const response = await ownerData.agent.get(
                `/api/v1/projects/${ownerData.project._id}/members?role=${encodeURIComponent(targetRole)}`
            );

            expect(response.statusCode).toBe(200);

            const { members, pagination } = response.body.data;

            expect(members).toHaveLength(1);
            expect(members[0].role).toBe(targetRole);
            expect(members[0].user._id).toBe(
                memberData.user._id.toString()
            );
            expect(pagination.totalMembers).toBe(1);
        } finally {
            if (createdMembership) {
                await ProjectMember.deleteOne({
                    _id: createdMembership._id,
                });
            }

            await cleanupTestData(ownerData);
            await cleanupTestData(memberData);
        }
    }, 15000);

    test("should reject an invalid project member role filter", async () => {
        const testData = await createTestSetup();

        try {
            const response = await testData.agent.get(
                `/api/v1/projects/${testData.project._id}/members?role=INVALID_ROLE`
            );

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(
                "Invalid project member role"
            );
        } finally {
            await cleanupTestData(testData);
        }
    }, 15000);

    it("should search projects by name and description", async () => {
        const testData = await createTestSetup();
        const suffix = `${process.pid}-${Date.now()}`;
        const backendProjectName = `Backend Authentication API ${suffix}`;
        const taskManagerName = `Task Manager ${suffix}`;
        const portfolioName = `Portfolio Website ${suffix}`;

        try {
            await testData.agent
                .post("/api/v1/projects")
                .send({
                    name: backendProjectName,
                    description: "Handles user login",
                })
                .expect(201);

            await testData.agent
                .post("/api/v1/projects")
                .send({
                    name: taskManagerName,
                    description: "Backend project tracking",
                })
                .expect(201);

            await testData.agent
                .post("/api/v1/projects")
                .send({
                    name: portfolioName,
                    description: "Personal frontend showcase",
                })
                .expect(201);

            const response = await testData.agent
                .get("/api/v1/projects?search=backend")
                .expect(200);

            expect(response.body.success).toBe(true);

            const { projects, pagination } = response.body.data;

            expect(projects).toHaveLength(2);
            expect(
                projects.map((item) => item.project.name).sort(),
            ).toEqual([
                backendProjectName, taskManagerName].sort()
            );
            expect(pagination.totalProjects).toBe(2);
            expect(pagination.totalPages).toBe(1);
        } finally {
            await cleanupTestData(testData);
        }
    }, 15000);

    it("should search project members by username", async () => {
        const ownerData = await createTestSetup();
        const searchUsername = `searchmember${Date.now()}`;

        const memberData = await createTestAuthSetup({
            userOverrides: {
                username: searchUsername,
            },
        });

        try {
            await ProjectMember.create({
                user: memberData.user._id,
                project: ownerData.project._id,
                role: UserRolesEnum.MEMBER,
            });

            const response = await ownerData.agent
                .get(
                    `/api/v1/projects/${ownerData.project._id}/members?search=${searchUsername}`,
                )
                .expect(200);

            expect(response.body.success).toBe(true);

            const { members, pagination } = response.body.data;

            expect(members).toHaveLength(1);
            expect(members[0].user.username).toBe(searchUsername);
            expect(pagination.totalMembers).toBe(1);
        } finally {
            await cleanupTestData(ownerData);
            await cleanupTestData(memberData);
        }
    }, 15000);
})