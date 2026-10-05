export const taskSchemas = {
    TaskAssignedUser: {
        $_id: "65f1a2b3c4d5e6f789012345",
        avatar: {
            url: "https://placehold.co/200x200",
            localPath: ""
        },
        $username: "jhon",
        fullName: "Jhon"
    },
    TaskAttachment: {
        $_id: "65f1a2b3c4d5e6f789012346",
        $url: "https://example.com/files/document.pdf",
        $mimetype: "application/pdf",
        $size: 245760
    },
    Task: {
        $_id: "65f1a2b3c4d5e6f789012347",
        $title: "Implement authentication",
        description: "Implement JWT authentication",
        $project: "65f1a2b3c4d5e6f789012348",
        assignedTo: "65f1a2b3c4d5e6f789012349",
        $assignedBy: "65f1a2b3c4d5e6f789012350",
        status: "TODO",
        attachments: {
            type: "array",
            items: {
                $ref: "#/components/schemas/TaskAttachment"
            }
        },
        createdAt: "2026-10-04T10:00:00.000Z",
        updatedAt: "2026-10-04T10:00:00.000Z"
    },
    TaskListItem: {
        $_id: "65f1a2b3c4d5e6f789012347",
        $title: "Implement authentication",
        description: "Implement JWT authentication",
        $project: "65f1a2b3c4d5e6f789012348",
        assignedTo: {
            $ref: "#/components/schemas/TaskAssignedUser"
        },
        $assignedBy: "65f1a2b3c4d5e6f789012350",
        status: "TODO",
        attachments: {
            type: "array",
            items: {
                $ref: "#/components/schemas/TaskAttachment"
            }
        },
        createdAt: "2026-10-04T10:00:00.000Z",
        updatedAt: "2026-10-04T10:00:00.000Z"
    },
    TasksResponse: {
        statusCode: 200,
        data: {
            type: "array",
            items: {
                $ref: "#/components/schemas/TaskListItem"
            }
        },
        message: "Task fetched successfully",
        success: true
    },
    CreateTaskResponse: {
        statusCode: 201,
        data: {
            $ref: "#/components/schemas/Task"
        },
        message: "Task created successfully",
        success: true
    },
    SubTaskCreatedBy: {
        $_id: "65f1a2b3c4d5e6f789012351",
        $username: "jhon",
        fullName: "Jhon",
        avatar: {
            url: "https://placehold.co/200x200",
            localPath: ""
        }
    },
    SubTask: {
        $_id: "65f1a2b3c4d5e6f789012352",
        $title: "Test authentication",
        $task: "65f1a2b3c4d5e6f789012347",
        isCompleted: false,
        createdBy: {
            $ref: "#/components/schemas/SubTaskCreatedBy"
        },
        createdAt: "2026-10-04T10:00:00.000Z",
        updatedAt: "2026-10-04T10:00:00.000Z"
    },
    TaskDetail: {
        $_id: "65f1a2b3c4d5e6f789012347",
        $title: "Implement authentication",
        description: "Implement JWT authentication",
        $project: "65f1a2b3c4d5e6f789012348",
        assignedTo: {
            $ref: "#/components/schemas/TaskAssignedUser"
        },
        $assignedBy: "65f1a2b3c4d5e6f789012350",
        status: "todo",
        attachments: {
            type: "array",
            items: {
                $ref: "#/components/schemas/TaskAttachment"
            }
        },
        subtasks: {
            type: "array",
            items: {
                $ref: "#/components/schemas/SubTask"
            }
        },
        createdAt: "2026-10-04T10:00:00.000Z",
        updatedAt: "2026-10-04T10:00:00.000Z"
    },
    TaskDetailResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/TaskDetail"
        },
        message: "Task fetched successfully",
        success: true
    },
    UpdateTaskResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/TaskListItem"
        },
        message: "Task updated successfully",
        success: true
    },
    DeleteTaskResponse: {
        statusCode: 200,
        data: {},
        message: "Task deleted successfully",
        success: true
    },
};