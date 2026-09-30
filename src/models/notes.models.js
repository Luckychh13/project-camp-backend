import mongoose from "mongoose"

const noteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        content: {
            type: String,
            required: true,
            trim: true
        },

        project: {
            type: mongoose.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },

        createdBy: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
)

export const Note = mongoose.model("Note", noteSchema)