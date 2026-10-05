export const subTaskSchemas = {
    CreateSubTaskRequest: {
        $title: "Implement login validation"
    },
    UpdateSubTaskRequest: {
        title: "Updated subtask title",
        isCompleted: true
    },
    SubTask: {
        $_id: "65f1a2b3c4d5e6f789012353",
        $title: "Implement login validation",
        $task: "65f1a2b3c4d5e6f789012354",
        isCompleted: false,
        $createdBy: "65f1a2b3c4d5e6f789012355",
        createdAt: "2026-10-05T10:00:00.000Z",
        updatedAt: "2026-10-05T10:00:00.000Z"
    },
    CreateSubTaskResponse: {
        statusCode: 201,
        data: {
            $ref: "#/components/schemas/SubTask"
        },
        message: "subTask created successfully",
        success: true
    },
    UpdateSubTaskResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/SubTask"
        },
        message: "SubTask updated successfully",
        success: true
    },
    DeleteSubTaskResponse: {
        statusCode: 200,
        data: {},
        message: "SubTask deleted successfully",
        success: true
    }
};