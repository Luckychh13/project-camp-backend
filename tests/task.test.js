import "dotenv/config"
import mongoose from "mongoose"
import request from "supertest"
import app from "../src/app.js"
import { createTestSetup, cleanupTestData } from "./helpers/testSetup.js";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI)
})

afterAll(async () => {
    await mongoose.connection.close()
})

describe("Task Api", () => {

    test("should reject create task without authenticaion", async () => {
        const projectId = new mongoose.Types.ObjectId()

        const response = await request(app)
            .post(`/api/v1/tasks/${projectId}`)
            .send({
                title: "Test Task",
                description: "Test task description"
            })

        expect(response.statusCode).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe("Unauthorized request")
    })

    test("should reject create task without title", async () => {
        const testData = await createTestSetup();

        try {
            const response = await testData.agent
                .post(`/api/v1/tasks/${testData.project._id}`)
                .send({
                    description: "Task without title"
                });

            expect(response.statusCode).toBe(422);
            expect(response.body.success).toBe(false);

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: "Title is required"
                    })
                ])
            );

        } finally {
            await cleanupTestData(testData);
        }
    }, 15000);

    
})