import "dotenv/config"
import mongoose from "mongoose"
import request from "supertest"
import app from "../src/app.js"
import { User } from "../src/models/user.models.js";
import { Project } from "../src/models/project.models.js";
import { ProjectMember } from "../src/models/projectmembers.models.js";
import { UserRolesEnum } from "../src/utils/constants.js";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
});

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
        expect(response.body.message).toBe("Unauthorized request")
    })

    test("should reject create project without project name", async () => {
        const agent = request.agent(app)

        await agent
            .post("/api/v1/auth/login")
            .send({
                email: process.env.REGISTERED_EMAIL,
                password: process.env.REGISTERED_PASSWORD,
            })

        const response = await agent
            .post("/api/v1/projects")
            .send({
                description: "Test project description"
            })

        expect(response.statusCode).toBe(422)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe("Recieved data is not valid")
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "Name is required"
                })
            ])
        )
    })

    test("should create project successfully", async () => {
        const user = await User.create({
            username: `projectuser${Date.now()}`,
            email: `peojectuser${Date.now()}@gmail.com`,
            password: "1234567"
        })

        const agent = await request.agent(app)

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: user.email,
                    password: "1234567"
                })

            const response = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Test Project ${Date.now()}`,
                    description: "Test project description"
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Project created Successfully"
            );

            expect(response.body.data).toBeDefined();
            expect(response.body.data.name).toBeDefined();
            expect(response.body.data.description).toBe(
                "Test project description"
            );

            expect(response.body.data.createdBy.toString()).toBe(
                user._id.toString()
            );

            const project = await Project.findById(response.body.data._id);
            expect(project).toBeDefined();
            expect(project.name).toBe(
                response.body.data.name
            );

            await ProjectMember.deleteMany({
                project: project._id
            });
            await Project.findByIdAndDelete(project._id);
        } finally {
            await User.findByIdAndDelete(user._id);
        }

    })

    test("should reject get projects without authentication", async () => {
        const response = await request(app)
            .get("/api/v1/projects/");

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Unauthorized request");
    });

    test("should get projects successfully", async () => {
        const user = await User.create({
            username: `getprojectuser${Date.now()}`,
            email: `getprojectuser${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: user.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Test Project ${Date.now()}`,
                    description: "Test project description"
                });

            project = createResponse.body.data;

            const response = await agent
                .get("/api/v1/projects/");

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Projects fetched successfully"
            );

            expect(response.body.data).toBeDefined();
            expect(response.body.data.length).toBeGreaterThan(0);

            expect(response.body.data[0].project.name).toBe(
                project.name
            );
        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(user._id);
        }
    });

    test("should reject get project by id without authentication", async () => {
        const response = await request(app)
            .get("/api/v1/projects/507f1f77bcf86cd799439011");

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Unauthorized request");
    });

    test("should get project by id successfully", async () => {
        const user = await User.create({
            username: `singleproject${Date.now()}`,
            email: `singleproject${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: user.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Single Project ${Date.now()}`,
                    description: "Project for get by id test"
                });

            project = createResponse.body.data;

            const response = await agent
                .get(`/api/v1/projects/${project._id}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Prioject fetched successfully"
            );

            expect(response.body.data).toBeDefined();
            expect(response.body.data._id).toBe(project._id);
            expect(response.body.data.name).toBe(project.name);
            expect(response.body.data.description).toBe(
                project.description
            );
        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(user._id);
        }
    });

    test("should reject get project by id when user is not a member", async () => {
        const owner = await User.create({
            username: `owner${Date.now()}`,
            email: `owner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const otherUser = await User.create({
            username: `other${Date.now()}`,
            email: `other${Date.now()}@gmail.com`,
            password: "password123"
        });

        const ownerAgent = request.agent(app);
        const otherUserAgent = request.agent(app);

        let project;

        try {
            await ownerAgent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await ownerAgent
                .post("/api/v1/projects/")
                .send({
                    name: `Private Project ${Date.now()}`,
                    description: "Project for permission test"
                });

            project = createResponse.body.data;

            await otherUserAgent
                .post("/api/v1/auth/login")
                .send({
                    email: otherUser.email,
                    password: "password123"
                });

            const response = await otherUserAgent
                .get(`/api/v1/projects/${project._id}`);

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "You are not a member of this project"
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(otherUser._id);
        }
    }, 15000);

    test("should update project successfully", async () => {
        const user = await User.create({
            username: `updateproject${Date.now()}`,
            email: `updateproject${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: user.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: "Old Project Name",
                    description: "Old description"
                });

            project = createResponse.body.data;

            const response = await agent
                .put(`/api/v1/projects/${project._id}`)
                .send({
                    name: "Updated Project Name",
                    description: "Updated description"
                });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Project updated successfully"
            );

            expect(response.body.data.name).toBe(
                "Updated Project Name"
            );

            expect(response.body.data.description).toBe(
                "Updated description"
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(user._id);
        }
    });

    test("should reject update project when user is not an admin", async () => {
        const owner = await User.create({
            username: `updateowner${Date.now()}`,
            email: `updateowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `updatemember${Date.now()}`,
            email: `updatemember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const ownerAgent = request.agent(app);
        const memberAgent = request.agent(app);

        let project;

        try {
            await ownerAgent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await ownerAgent
                .post("/api/v1/projects/")
                .send({
                    name: "Original Project",
                    description: "Original description"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            await memberAgent
                .post("/api/v1/auth/login")
                .send({
                    email: member.email,
                    password: "password123"
                });

            const response = await memberAgent
                .put(`/api/v1/projects/${project._id}`)
                .send({
                    name: "Hacked Project",
                    description: "Changed by member"
                });

            expect(response.statusCode).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
        }
    }, 15000);

    test("should delete project successfully", async () => {
        const user = await User.create({
            username: `deleteproject${Date.now()}`,
            email: `deleteproject${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: user.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: "Project To Delete",
                    description: "Project for delete test"
                });

            project = createResponse.body.data;

            const response = await agent
                .delete(`/api/v1/projects/${project._id}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Project deleted successfully"
            );

            const deletedProject = await Project.findById(project._id);

            expect(deletedProject).toBeNull();

            const remainingMembers = await ProjectMember.find({
                project: project._id
            });

            expect(remainingMembers).toHaveLength(0);

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(user._id);
        }
    });

    test("should reject delete project when user is not an admin", async () => {
        const owner = await User.create({
            username: `deleteowner${Date.now()}`,
            email: `deleteowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `deletemember${Date.now()}`,
            email: `deletemember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const ownerAgent = request.agent(app);
        const memberAgent = request.agent(app);

        let project;

        try {

            await ownerAgent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await ownerAgent
                .post("/api/v1/projects/")
                .send({
                    name: "Delete Permission Test",
                    description: "Test project"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            await memberAgent
                .post("/api/v1/auth/login")
                .send({
                    email: member.email,
                    password: "password123"
                });

            const response = await memberAgent
                .delete(`/api/v1/projects/${project._id}`);

            expect(response.statusCode).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            );

            const existingProject = await Project.findById(project._id);

            expect(existingProject).not.toBeNull();

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
        }
    }, 15000);

    test("should reject get project members without authentication", async () => {
        const response = await request(app)
            .get("/api/v1/projects/507f1f77bcf86cd799439011/members");

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Unauthorized request");
    });

    test("should get project members successfully", async () => {
        const owner = await User.create({
            username: `memberowner${Date.now()}`,
            email: `memberowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `projectmember${Date.now()}`,
            email: `projectmember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Members Test ${Date.now()}`,
                    description: "Test project"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            const response = await agent
                .get(`/api/v1/projects/${project._id}/members`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Project members fetched"
            );

            expect(response.body.data).toBeDefined();
            expect(response.body.data.length).toBe(2);

            expect(response.body.data.some(
                item => item.user.username === owner.username
            )).toBe(true);

            expect(response.body.data.some(
                item => item.user.username === member.username
            )).toBe(true);

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
        }
    });

    test("should add member to project successfully", async () => {
        const owner = await User.create({
            username: `addowner${Date.now()}`,
            email: `addowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const newMember = await User.create({
            username: `newmember${Date.now()}`,
            email: `newmember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Member Test Project ${Date.now()}`,
                    description: "Testing add member"
                });

            project = createResponse.body.data;

            const response = await agent
                .post(`/api/v1/projects/${project._id}/members`)
                .send({
                    email: newMember.email,
                    role: UserRolesEnum.MEMBER
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Added project member role"
            );

            const projectMember = await ProjectMember.findOne({
                project: project._id,
                user: newMember._id
            });

            expect(projectMember).toBeDefined();
            expect(projectMember.role).toBe(
                UserRolesEnum.MEMBER
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(newMember._id);
        }
    });

    test("should reject adding member with invalid role", async () => {
        const owner = await User.create({
            username: `invalidroleowner${Date.now()}`,
            email: `invalidroleowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const newMember = await User.create({
            username: `invalidrolemember${Date.now()}`,
            email: `invalidrolemember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Invalid Role Test ${Date.now()}`,
                    description: "Testing invalid role"
                });

            project = createResponse.body.data;

            const response = await agent
                .post(`/api/v1/projects/${project._id}/members`)
                .send({
                    email: newMember.email,
                    role: "manager"
                });

            expect(response.statusCode).toBe(422);
            expect(response.body.success).toBe(false);

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: "Role is invalid"
                    })
                ])
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(newMember._id);
        }
    });

    test("should reject adding member when user does not exist", async () => {
        const owner = await User.create({
            username: `memberowner${Date.now()}`,
            email: `memberowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Nonexistent User Test ${Date.now()}`,
                    description: "Testing missing user"
                });

            project = createResponse.body.data;

            const response = await agent
                .post(`/api/v1/projects/${project._id}/members`)
                .send({
                    email: "doesnotexist@gmail.com",
                    role: UserRolesEnum.MEMBER
                });

            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "User doesnot exits"
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
        }
    });

    test("should update project member role successfully", async () => {
        const owner = await User.create({
            username: `roleowner${Date.now()}`,
            email: `roleowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `rolemember${Date.now()}`,
            email: `rolemember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Role Test ${Date.now()}`,
                    description: "Testing role update"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            const response = await agent
                .put(`/api/v1/projects/${project._id}/members/${member._id}`)
                .send({
                    newRole: UserRolesEnum.PROJECT_ADMIN
                });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Project member role updated successfully"
            );

            expect(response.body.data.role).toBe(
                UserRolesEnum.PROJECT_ADMIN
            );

            const updatedMember = await ProjectMember.findOne({
                project: project._id,
                user: member._id
            });

            expect(updatedMember.role).toBe(
                UserRolesEnum.PROJECT_ADMIN
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
        }
    }, 15000);

    test("should reject updating member with invalid role", async () => {
        const owner = await User.create({
            username: `invalidroleowner${Date.now()}`,
            email: `invalidroleowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `invalidrolemember${Date.now()}`,
            email: `invalidrolemember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Invalid Role Update ${Date.now()}`,
                    description: "Testing invalid member role"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            const response = await agent
                .put(`/api/v1/projects/${project._id}/members/${member._id}`)
                .send({
                    newRole: "manager"
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Invalid role");

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
        }
    }, 15000);

    test("should reject role update when project member does not exist", async () => {
        const owner = await User.create({
            username: `roleupdateowner${Date.now()}`,
            email: `roleupdateowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const nonMember = await User.create({
            username: `nonmember${Date.now()}`,
            email: `nonmember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Missing Member Test ${Date.now()}`,
                    description: "Testing missing project member"
                });

            project = createResponse.body.data;


            const response = await agent
                .put(`/api/v1/projects/${project._id}/members/${nonMember._id}`)
                .send({
                    newRole: UserRolesEnum.PROJECT_ADMIN
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Project member not found"
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(nonMember._id);
        }
    }, 15000);

    test("should delete project member successfully", async () => {
        const owner = await User.create({
            username: `deleteMemberOwner${Date.now()}`,
            email: `deleteMemberOwner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `deleteMemberUser${Date.now()}`,
            email: `deleteMemberUser${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Delete Member Test ${Date.now()}`,
                    description: "Testing member deletion"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            const response = await agent
                .delete(
                    `/api/v1/projects/${project._id}/members/${member._id}`
                );

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Project member deleted successfully"
            );

            const deletedMember = await ProjectMember.findOne({
                project: project._id,
                user: member._id
            });

            expect(deletedMember).toBeNull();

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
        }
    }, 15000);

    test("should reject deleting project member when member does not exist", async () => {
        const owner = await User.create({
            username: `deletenomemberowner${Date.now()}`,
            email: `deletenomemberowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const nonMember = await User.create({
            username: `deletenomemberuser${Date.now()}`,
            email: `deletenomemberuser${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Delete Missing Member ${Date.now()}`,
                    description: "Testing missing member deletion"
                });

            project = createResponse.body.data;


            const response = await agent
                .delete(
                    `/api/v1/projects/${project._id}/members/${nonMember._id}`
                );

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Project member not found"
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(nonMember._id);
        }
    }, 15000);

    test("should reject adding member when requester is not an admin", async () => {
        const owner = await User.create({
            username: `addpermissionowner${Date.now()}`,
            email: `addpermissionowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `addpermissionmember${Date.now()}`,
            email: `addpermissionmember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const newUser = await User.create({
            username: `addpermissionnew${Date.now()}`,
            email: `addpermissionnew${Date.now()}@gmail.com`,
            password: "password123"
        });

        const ownerAgent = request.agent(app);
        const memberAgent = request.agent(app);

        let project;

        try {

            await ownerAgent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await ownerAgent
                .post("/api/v1/projects/")
                .send({
                    name: `Add Member Permission ${Date.now()}`,
                    description: "Testing member permissions"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            await memberAgent
                .post("/api/v1/auth/login")
                .send({
                    email: member.email,
                    password: "password123"
                });

            const response = await memberAgent
                .post(`/api/v1/projects/${project._id}/members`)
                .send({
                    email: newUser.email,
                    role: UserRolesEnum.MEMBER
                });

            expect(response.statusCode).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            );

            const projectMember = await ProjectMember.findOne({
                project: project._id,
                user: newUser._id
            });

            expect(projectMember).toBeNull();

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
            await User.findByIdAndDelete(newUser._id);
        }
    }, 15000);

    test("should reject get project members when user is not a member", async () => {
        const owner = await User.create({
            username: `getmembersowner${Date.now()}`,
            email: `getmembersowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const nonMember = await User.create({
            username: `getmembersnonmember${Date.now()}`,
            email: `getmembersnonmember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const ownerAgent = request.agent(app);
        const nonMemberAgent = request.agent(app);

        let project;

        try {
            await ownerAgent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await ownerAgent
                .post("/api/v1/projects/")
                .send({
                    name: `Members Permission ${Date.now()}`,
                    description: "Testing member access"
                });

            project = createResponse.body.data;

            await nonMemberAgent
                .post("/api/v1/auth/login")
                .send({
                    email: nonMember.email,
                    password: "password123"
                });

            const response = await nonMemberAgent
                .get(`/api/v1/projects/${project._id}/members`);

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "You are not a member of this project"
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(nonMember._id);
        }
    }, 15000);

    test("should reject deleting member when requester is not an admin", async () => {
        const owner = await User.create({
            username: `deletememberowner${Date.now()}`,
            email: `deletememberowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `deletememberrequester${Date.now()}`,
            email: `deletememberrequester${Date.now()}@gmail.com`,
            password: "password123"
        });

        const targetMember = await User.create({
            username: `targetmember${Date.now()}`,
            email: `targetmember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const ownerAgent = request.agent(app);
        const memberAgent = request.agent(app);

        let project;

        try {
            await ownerAgent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await ownerAgent
                .post("/api/v1/projects/")
                .send({
                    name: `Delete Member Permission ${Date.now()}`,
                    description: "Testing delete member permission"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            await ProjectMember.create({
                user: targetMember._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            await memberAgent
                .post("/api/v1/auth/login")
                .send({
                    email: member.email,
                    password: "password123"
                });

            const response = await memberAgent
                .delete(
                    `/api/v1/projects/${project._id}/members/${targetMember._id}`
                );

            expect(response.statusCode).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "You do not have permission to perform this action"
            );

            const existingMember = await ProjectMember.findOne({
                project: project._id,
                user: targetMember._id
            });

            expect(existingMember).not.toBeNull();

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
            await User.findByIdAndDelete(targetMember._id);
        }
    }, 15000);

    test("should reject adding member without email and role", async () => {
        const owner = await User.create({
            username: `missingfieldsowner${Date.now()}`,
            email: `missingfieldsowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Missing Fields ${Date.now()}`,
                    description: "Testing validation"
                });

            project = createResponse.body.data;

            const response = await agent
                .post(`/api/v1/projects/${project._id}/members`)
                .send({});

            expect(response.statusCode).toBe(422);
            expect(response.body.success).toBe(false);

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        email: "Email is required"
                    }),
                    expect.objectContaining({
                        role: "Role is required"
                    })
                ])
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
        }
    }, 15000);

    test("should reject updating member without new role", async () => {
        const owner = await User.create({
            username: `missingroleowner${Date.now()}`,
            email: `missingroleowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `missingrolemember${Date.now()}`,
            email: `missingrolemember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Missing Role ${Date.now()}`,
                    description: "Testing missing newRole"
                });

            project = createResponse.body.data;

            await ProjectMember.create({
                user: member._id,
                project: project._id,
                role: UserRolesEnum.MEMBER
            });

            const response = await agent
                .put(`/api/v1/projects/${project._id}/members/${member._id}`)
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Invalid role");

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
        }
    }, 15000);

    test("should update role when adding an existing project member", async () => {
        const owner = await User.create({
            username: `upsertowner${Date.now()}`,
            email: `upsertowner${Date.now()}@gmail.com`,
            password: "password123"
        });

        const member = await User.create({
            username: `upsertmember${Date.now()}`,
            email: `upsertmember${Date.now()}@gmail.com`,
            password: "password123"
        });

        const agent = request.agent(app);

        let project;

        try {
            await agent
                .post("/api/v1/auth/login")
                .send({
                    email: owner.email,
                    password: "password123"
                });

            const createResponse = await agent
                .post("/api/v1/projects/")
                .send({
                    name: `Upsert Test ${Date.now()}`,
                    description: "Testing existing member"
                });

            project = createResponse.body.data;

            await agent
                .post(`/api/v1/projects/${project._id}/members`)
                .send({
                    email: member.email,
                    role: UserRolesEnum.MEMBER
                });

            const response = await agent
                .post(`/api/v1/projects/${project._id}/members`)
                .send({
                    email: member.email,
                    role: UserRolesEnum.PROJECT_ADMIN
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);

            const members = await ProjectMember.find({
                project: project._id,
                user: member._id
            });

            expect(members).toHaveLength(1);

            expect(members[0].role).toBe(
                UserRolesEnum.PROJECT_ADMIN
            );

        } finally {
            if (project?._id) {
                await ProjectMember.deleteMany({
                    project: project._id
                });

                await Project.findByIdAndDelete(project._id);
            }

            await User.findByIdAndDelete(owner._id);
            await User.findByIdAndDelete(member._id);
        }
    }, 15000);
})
