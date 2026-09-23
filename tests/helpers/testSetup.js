import request from "supertest"
import app from "../../src/app.js"

import { User } from "../../src/models/user.models.js"
import { Project } from "../../src/models/project.models.js"
import { ProjectMember } from "../../src/models/projectmembers.models.js"
import { Task } from "../../src/models/task.models.js"
import { SubTask } from "../../src/models/subtask.models.js"

import { UserRolesEnum } from "../../src/utils/constants.js"

export const TEST_PASSWORD = "password123"

const generateUniqueId = () => {
    return `${Date.now()}${Math.floor(Math.random() * 10000)}`
}

export const createTestUser = async (overrides = {}) => {
    const uniqueId = generateUniqueId()

    const user = await User.create({
        username: `testuser${uniqueId}`,
        email: `test${uniqueId}@gmail.com`,
        password: TEST_PASSWORD,
        ...overrides
    })

    return user
}

export const loginTestUser = async (
    user,
    password = TEST_PASSWORD
) => {
    const agent = request.agent(app)

    const response = await agent
        .post("/api/v1/auth/login")
        .send({
            email: user.email,
            password
        })

    if (response.statusCode !== 200) {
        throw new Error(
            `Test login failed with status ${response.statusCode}: ${response.body.message}`
        )
    }

    return agent
}

export const createTestAuthSetup = async ({
    userOverrides = {}
} = {}) => {
    let user

    try {
        user = await createTestUser(userOverrides)

        const agent = await loginTestUser(user)

        return {
            user,
            agent
        }
    } catch (error) {
        await cleanupTestData({ user })
        throw error
    }
}

export const createTestProject = async (
    agent,
    overrides = {}
) => {
    const uniqueId = generateUniqueId()

    const response = await agent
        .post("/api/v1/projects/")
        .send({
            name: `Test Project ${uniqueId}`,
            description: "Project created for testing",
            ...overrides
        })

    if (response.statusCode !== 201) {
        throw new Error(
            `Test project creation failed with status ${response.statusCode}: ${response.body.message}`
        )
    }

    return response.body.data
}

export const setTestProjectRole = async ({
    userId,
    projectId,
    role
}) => {
    const projectMember = await ProjectMember.findOneAndUpdate(
        {
            user: userId,
            project: projectId
        },
        {
            $set: {
                role
            }
        },
        {
            new: true
        }
    )

    if (!projectMember) {
        throw new Error("Test project member was not found")
    }

    return projectMember
}

export const createTestSetup = async ({
    role = UserRolesEnum.ADMIN,
    userOverrides = {},
    projectOverrides = {}
} = {}) => {
    let user
    let project
    let agent

    try {
        const authSetup = await createTestAuthSetup({
            userOverrides
        })

        user = authSetup.user
        agent = authSetup.agent

        project = await createTestProject(
            agent,
            projectOverrides
        )

        if (role !== UserRolesEnum.ADMIN) {
            await setTestProjectRole({
                userId: user._id,
                projectId: project._id,
                role
            })
        }

        return {
            user,
            agent,
            project,
            role
        }
    } catch (error) {
        await cleanupTestData({
            user,
            project
        })

        throw error
    }
}

export const cleanupTestData = async ({
    user,
    project
} = {}) => {
    if (project?._id) {
        const tasks = await Task.find({
            project: project._id
        }).select("_id")

        const taskIds = tasks.map(task => task._id)

        if (taskIds.length > 0) {
            await SubTask.deleteMany({
                task: {
                    $in: taskIds
                }
            })
        }

        await Task.deleteMany({
            project: project._id
        })

        await ProjectMember.deleteMany({
            project: project._id
        })

        await Project.findByIdAndDelete(project._id)
    }

    if (user?._id) {
        await User.findByIdAndDelete(user._id)
    }
}