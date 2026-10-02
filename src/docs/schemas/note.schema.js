export const noteSchemas = {
    CreateNoteRequest: {
        $title: "Meeting Notes",
        $content: "Discuss deployment"
    },
    UpdateNoteRequest: {
        title: "Updated Meeting Notes",
        content: "Deployment discussion updated"
    },
    Note: {
        $_id: "65f1a2b3c4d5e6f789012345",
        $title: "Meeting Notes",
        $content: "Discuss deployment",
        $project: "65f1a2b3c4d5e6f789012346",
        $createdBy: "65f1a2b3c4d5e6f789012347",
        createdAt: "2026-10-02T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z"
    },
    NoteResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/Note"
        },
        message: "Note fetched successfully",
        success: true
    },
    NotesResponse: {
        statusCode: 200,
        data: {
            type: "array",
            items: {
                $ref: '#/components/schemas/Note'
            }
        },
        message: "Notes fetched successfully",
        success: true
    },
    CreateNoteResponse: {
        statusCode: 201,
        data: {
            $ref: "#/components/schemas/Note"
        },
        message: "Note created successfully",
        success: true
    },
    UpdateNoteResponse: {
        statusCode: 200,
        data: {
            $ref: "#/components/schemas/Note"
        },
        message: "Note updated successfully",
        success: true
    },
    DeleteNoteResponse: {
        statusCode: 200,
        data: null,
        message: "Note deleted successfully",
        success: true
    }

}