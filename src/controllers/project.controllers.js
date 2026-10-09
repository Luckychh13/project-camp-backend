import { User } from "../models/user.models.js"
import { Project } from "../models/project.models.js"
import { ProjectMember } from "../models/projectmembers.models.js"
import { ApiResponse } from "../utils/api-response.js"
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"
import mongoose, { Mongoose } from "mongoose"
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js"


const getProjects = asyncHandler(async (req, res) => {
    /*
    #swagger.tags = ['Projects']
    #swagger.summary = 'Get user projects'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Projects fetched successfully',
        schema: {
            $ref: '#/components/schemas/ProjectsResponse'
        }
    }
*/
    const projects = await ProjectMember.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "project",
                pipeline: [
                    {
                        $lookup: {
                            from: "projectmembers",
                            localField: "_id",
                            foreignField: "project",
                            as: "projectmembers",
                        },
                    },
                    {
                        $addFields: {
                            members: {
                                $size: "$projectmembers",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$project",
        },
        {
            $project: {
                project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    members: 1,
                    createdAt: 1,
                    createdBy: 1,
                },
                role: 1,
                _id: 0,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Projects']
        #swagger.summary = 'Get project by ID'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.responses[200] = {
            description: 'Project fetched successfully',
            schema: {
                $ref: '#/components/schemas/ProjectResponse'
            }
        }

        #swagger.responses[400] = {
            description: 'Invalid project ID or user is not a member of the project',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[404] = {
            description: 'Project not found',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { projectId } = req.params

    if (!mongoose.isValidObjectId(projectId)) {
        throw new ApiError(400, "Invalid project id")
    }

    const project = await Project.findById(projectId)
    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            project,
            "Prioject fetched successfully"
        ))
});

const createProject = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Projects']
        #swagger.summary = 'Create a new project'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: '#/components/schemas/CreateProjectRequest'
                    }
                }
            }
        }

        #swagger.responses[201] = {
            description: 'Project created successfully',
            schema: {
                $ref: '#/components/schemas/CreateProjectResponse'
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[422] = {
            description: 'Validation failed',
            schema: {
                $ref: '#/components/schemas/ValidationErrorResponse'
            }
        }
    */
    const { name, description } = req.body;

    const project = await Project.create({
        name,
        description,
        createdBy: req.user._id,
    });

    await ProjectMember.create({
        user: req.user._id,
        project: project._id,
        role: UserRolesEnum.ADMIN,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, project, "Project created Successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
    /*
    #swagger.tags = ['Projects']
    #swagger.summary = 'Update project'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: '#/components/schemas/UpdateProjectRequest'
                }
            }
        }
    }

    #swagger.responses[200] = {
        description: 'Project updated successfully',
        schema: {
            $ref: '#/components/schemas/UpdateProjectResponse'
        }
    }

    #swagger.responses[400] = {
        description: 'Invalid project ID or user is not authorized for this project',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Project not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[422] = {
        description: 'Validation failed',
        schema: {
            $ref: '#/components/schemas/ValidationErrorResponse'
        }
    }
*/
    const { name, description } = req.body;
    const { projectId } = req.params;

    const project = await Project.findByIdAndUpdate(
        projectId,
        {
            name,
            description,
        },
        { returnDocument: "after" },
    );

    if (!project) {
        throw new ApiError(404, "Project not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
    /*
    #swagger.tags = ['Projects']
    #swagger.summary = 'Delete project'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.responses[200] = {
        description: 'Project deleted successfully',
        schema: {
            $ref: '#/components/schemas/DeleteProjectResponse'
        }
    }

    #swagger.responses[400] = {
        description: 'Invalid project ID or user is not a member of the project',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[401] = {
        description: 'Unauthorized',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[403] = {
        description: 'User does not have permission to delete the project',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }

    #swagger.responses[404] = {
        description: 'Project not found',
        schema: {
            $ref: '#/components/schemas/ErrorResponse'
        }
    }
*/
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    await ProjectMember.deleteMany({
        project: project._id
    });

    await Project.findByIdAndDelete(projectId);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Project deleted successfully"
            )
        );
});

const addMembersToProject = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Projects']
        #swagger.summary = 'Add member to project'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: '#/components/schemas/AddProjectMemberRequest'
                    }
                }
            }
        }

        #swagger.responses[201] = {
            description: 'Project member added successfully',
            schema: {
                $ref: '#/components/schemas/AddProjectMemberResponse'
            }
        }

        #swagger.responses[400] = {
            description: 'Invalid project ID or invalid project/member data',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[403] = {
            description: 'User does not have permission to add project members',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[404] = {
            description: 'Project or user not found',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[409] = {
            description: 'User is already a member of the project',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[422] = {
            description: 'Validation failed',
            schema: {
                $ref: '#/components/schemas/ValidationErrorResponse'
            }
        }
    */
    const { projectId } = req.params
    const { email, role } = req.body
    if (!AvailableUserRole.includes(role)) {
        throw new ApiError(400, "Invalid role")
    }

    const user = await User.findOne({ email })
    if (!user) {
        throw new ApiError(404, "User doesnot exits")
    }

    await ProjectMember.findOneAndUpdate({
        user: new mongoose.Types.ObjectId(user._id),
        project: new mongoose.Types.ObjectId(projectId)
    },
        {
            user: new mongoose.Types.ObjectId(user._id),
            project: new mongoose.Types.ObjectId(projectId),
            role: role
        },
        {
            returnDocument: "after",
            upsert: true
        })

    return res
        .status(201)
        .json(new ApiResponse(201, {}, "Added project member role"))
})

const getProjectMembers = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Projects']
        #swagger.summary = 'Get project members'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.responses[200] = {
            description: 'Project members fetched successfully',
            schema: {
                $ref: '#/components/schemas/ProjectMembersResponse'
            }
        }

        #swagger.responses[400] = {
            description: 'Invalid project ID or user is not a member of the project',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[404] = {
            description: 'Project not found',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { projectId } = req.params

    const project = await Project.findById(projectId)
    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    const projectMembers = await ProjectMember.aggregate([
        {
            $match: {
                project: new mongoose.Types.ObjectId(projectId)
            }
        }, {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        }, {
            $addFields: {
                user: {
                    $arrayElemAt: ["$user", 0]
                }
            }
        }, {
            $project: {
                project: 1,
                user: 1,
                role: 1,
                createdAt: 1,
                updatedAt: 1,
                _id: 0
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, projectMembers, "Project members fetched"))

})

const updateMemberRole = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Projects']
        #swagger.summary = 'Update project member role'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: '#/components/schemas/UpdateProjectMemberRequest'
                    }
                }
            }
        }

        #swagger.responses[200] = {
            description: 'Project member role updated successfully',
            schema: {
                $ref: '#/components/schemas/UpdateProjectMemberResponse'
            }
        }

        #swagger.responses[400] = {
            description: 'Invalid project ID or invalid role',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[403] = {
            description: 'User does not have permission to update project member roles',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[404] = {
            description: 'Project member not found',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { projectId, userId } = req.params
    const { newRole } = req.body
    if (!AvailableUserRole.includes(newRole)) {
        throw new ApiError(400, "Invalid role")
    }

    let projectMember = await ProjectMember.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId)
    })
    if (!projectMember) {
        throw new ApiError(400, "Project member not found")
    }

    projectMember = await ProjectMember.findByIdAndUpdate(
        projectMember._id,
        {
            role: newRole,
        },
        {
            returnDocument: "after"
        }
    )
    if (!projectMember) {
        throw new ApiError(400, "Project member not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            projectMember,
            "Project member role updated successfully"
        ))
})

const deleteMember = asyncHandler(async (req, res) => {
    /*
        #swagger.tags = ['Projects']
        #swagger.summary = 'Remove member from project'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.responses[200] = {
            description: 'Project member deleted successfully',
            schema: {
                $ref: '#/components/schemas/DeleteProjectMemberResponse'
            }
        }

        #swagger.responses[400] = {
            description: 'Project member not found',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[401] = {
            description: 'Unauthorized',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }

        #swagger.responses[403] = {
            description: 'User does not have permission to remove project members',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { projectId, userId } = req.params

    let projectMember = await ProjectMember.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId)
    })
    if (!projectMember) {
        throw new ApiError(400, "Project member not found")
    }

    projectMember = await ProjectMember.findByIdAndDelete(projectMember._id)
    if (!projectMember) {
        throw new ApiError(400, "Project member not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            projectMember,
            "Project member deleted successfully"
        ))
})


export {
    addMembersToProject,
    createProject,
    deleteMember,
    getProjectById,
    getProjects,
    deleteProject,
    getProjectMembers,
    updateMemberRole,
    updateProject
}