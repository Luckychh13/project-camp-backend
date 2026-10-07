import multer from "multer"
import { randomUUID } from "crypto"
import path from "path"
import { ApiError } from "../utils/api-error.js"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/images")
    },

    filename: function (req, file, cb) {
        const originalExtension = path.extname(file.originalname).toLowerCase()

        const extension = /^\.[a-z0-9]{1,10}$/.test(originalExtension)
            ? originalExtension
            : ""

        cb(null, `${randomUUID()}${extension}`)
    }
})

export const upload = multer({
    storage,
    limits: {
        fileSize: 1 * 1000 * 1000,
        files: 5
    }
})

export const uploadAttachments = (req, res, next) => {
    upload.array("attachments", 5)(req, res, (error) => {
        if (!error) {
            return next()
        }

        if (error instanceof multer.MulterError) {
            switch (error.code) {
                case "LIMIT_FILE_SIZE":
                    return next(
                        new ApiError(
                            400,
                            "File size must not exceed 1 MB"
                        )
                    )

                case "LIMIT_FILE_COUNT":
                    return next(
                        new ApiError(
                            400,
                            "Maximum 5 files are allowed"
                        )
                    )

                case "LIMIT_UNEXPECTED_FILE":
                    return next(
                        new ApiError(
                            400,
                            "Unexpected file field or too many files"
                        )
                    )

                default:
                    return next(
                        new ApiError(
                            400,
                            "File upload failed"
                        )
                    )
            }
        }

        return next(
            new ApiError(
                400,
                error.message
            )
        )
    })
}