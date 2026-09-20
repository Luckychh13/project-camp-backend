import request from 'supertest';
import app from '../src/app.js'

describe("Healthcheck API", () => {
    test("should return server is running", async() => {
        const response = await request(app)
         .get('/api/v1/healthcheck')
        
        expect(response.statusCode).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.message).toBe('Server is running')
    })

    test("should return success message", async() => {
        const response = await request(app)
         .get('/api/v1/healthcheck')

        expect(response.body.message).toBe('Success') 
    })
})