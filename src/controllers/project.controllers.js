import { User } from "../models/user.models.js"
import { Project } from "../models/project.models.js"
import { ProjectMember } from "../models/projectmembers.models.js"
import { ApiResponse } from "../utils/api-response.js"
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"
import mongoose from "mongoose"
import { getPaginationOptions } from "../utils/pagination.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js"
import { getSortOptions } from "../utils/sorting.js"
import { getSearchRegex } from "../utils/search.js"


const getProjects = asyncHandler(async (req, res) => {
    // #swagger.autoQuery = false
/*
    #swagger.tags = ['Projects']
    #swagger.summary = 'Get user projects'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.parameters['page'] = {
        in: 'query',
        description: 'Page number, starting from 1. Defaults to 1.',
        required: false,
        '@schema': {
            type: 'integer',
            minimum: 1,
            default: 1,
            example: 1
        }
    }

    #swagger.parameters['limit'] = {
        in: 'query',
        description: 'Number of projects per page. Maximum is 100.',
        required: false,
        '@schema': {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
            example: 10
        }
    }

    #swagger.parameters['sortBy'] = {
        in: 'query',
        description: 'Field used to sort projects.',
        required: false,
        schema: {
            '@enum': ['name', 'createdAt', 'updatedAt'],
            default: 'createdAt',
            example: 'name'
        }
    }

    #swagger.parameters['order'] = {
        in: 'query',
        description: 'Sort direction.',
        required: false,
        schema: {
            '@enum': ['asc', 'desc'],
            default: 'desc',
            example: 'desc'
        }
    }

    #swagger.parameters['role'] = {
        in: 'query',
        description: 'Filter projects by the current user’s project role.',
        required: false,
        schema: {
            '@enum': ['admin', 'project_admin', 'member'],
            example: 'member'
        }
    }

    #swagger.parameters['search'] = {
        in: 'query',
        description: 'Optional case-insensitive partial search. Maximum length: 100 characters.',
        required: false,
        '@schema': {
            type: 'string',
            maxLength: 100,
            example: 'backend'
        }
    }

    #swagger.responses[200] = {
        description: 'Projects fetched successfully',
        schema: {
            $ref: '#/components/schemas/ProjectsResponse'
        }
    }

    #swagger.responses[400] = {
        description: 'Invalid pagination, sorting, or role filter parameters',
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

        */

    const { page, limit, skip } = getPaginationOptions(req.query);
    const sortOptions = getSortOptions(req.query, ["name", "createdAt", "updatedAt"])
    const { role } = req.query;
    const searchRegex = getSearchRegex(req.query.search)
    const projectSortOptions = Object.fromEntries(
        Object.entries(sortOptions).map(([field, direction]) => [
            field === "_id" ? "project._id" : `project.${field}`,
            direction,
        ])
    );
    const projectsFilter = {
        user: new mongoose.Types.ObjectId(req.user._id),
    };

    if (role !== undefined) {
        if (
            typeof role !== "string" ||
            !AvailableUserRole.includes(role)
        ) {
            throw new ApiError(400, "Invalid project role");
        }

        projectsFilter.role = role;
    }


    const [projects, totalProjects] = await Promise.all([
        ProjectMember.aggregate([
            {
                $match: projectsFilter,
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
            ...(searchRegex
                ? [
                    {
                        $match: {
                            $or: [
                                { "project.name": searchRegex },
                                { "project.description": searchRegex },
                            ],
                        },
                    },
                ]
                : []),
            {
                $sort: projectSortOptions,
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
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
        ]),

        searchRegex
            ? ProjectMember.aggregate([
                {
                    $match: projectsFilter,
                },
                {
                    $lookup: {
                        from: "projects",
                        localField: "project",
                        foreignField: "_id",
                        as: "project",
                    },
                },
                {
                    $unwind: "$project",
                },
                {
                    $match: {
                        $or: [
                            { "project.name": searchRegex },
                            { "project.description": searchRegex },
                        ],
                    },
                },
                {
                    $count: "totalProjects",
                },
            ]).then((result) => result[0]?.totalProjects ?? 0)
            : ProjectMember.countDocuments(projectsFilter),
    ]);

    const totalPages = Math.ceil(totalProjects / limit);

    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const nextPage = hasNextPage ? page + 1 : null;
    const previousPage = hasPreviousPage ? page - 1 : null;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                projects,
                pagination: {
                    currentPage: page,
                    limit,
                    totalProjects,
                    totalPages,
                    hasNextPage,
                    nextPage,
                    hasPreviousPage,
                    previousPage,
                },
            },
            "Projects fetched successfully"
        )
    );
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

        #swagger.responses[200] = {
            description: 'Existing project member role updated successfully',
            schema: {
                $ref: '#/components/schemas/AddProjectMemberResponse'
            }
        }

        #swagger.responses[201] = {
            description: 'Project member added successfully',
            schema: {
                $ref: '#/components/schemas/AddProjectMemberResponse'
            }
        }

        #swagger.responses[400] = {
            description: 'Invalid project ID',
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
            description: 'Conflict: the project must retain at least one admin',
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

    const existingMembership = await ProjectMember.findOne({
        user: new mongoose.Types.ObjectId(user._id),
        project: new mongoose.Types.ObjectId(projectId)
    })

    if (
        existingMembership?.role === UserRolesEnum.ADMIN &&
        role !== UserRolesEnum.ADMIN
    ) {
        const otherAdminCount = await ProjectMember.countDocuments({
            project: new mongoose.Types.ObjectId(projectId),
            role: UserRolesEnum.ADMIN,
            _id: { $ne: existingMembership._id }
        })

        if (otherAdminCount === 0) {
            throw new ApiError(
                409,
                "A project must have at least one admin"
            )
        }
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

    const statusCode = existingMembership ? 200 : 201

    const message = existingMembership
        ? "Project member role updated successfully"
        : "Added project member role"

    return res
        .status(statusCode)
        .json(new ApiResponse(statusCode, {}, message))

})

const getProjectMembers = asyncHandler(async (req, res) => {
    // #swagger.autoQuery = false
    /*
        #swagger.tags = ['Projects']
        #swagger.summary = 'Get project members'
        #swagger.security = [{ "bearerAuth": [] }]

        #swagger.parameters['page'] = {
            in: 'query',
            description: 'Page number, starting from 1. Defaults to 1.',
            required: false,
            '@schema': {
                type: 'integer',
                minimum: 1,
                default: 1,
                example: 1
            }
        }

        #swagger.parameters['limit'] = {
            in: 'query',
            description: 'Number of members per page. Maximum is 100.',
            required: false,
            '@schema': {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 10,
                example: 10
            }
        }

        #swagger.parameters['sortBy'] = {
            in: 'query',
            description: 'Field used to sort project members.',
            required: false,
            schema: {
                '@enum': ['role', 'createdAt', 'updatedAt'],
                default: 'createdAt',
                example: 'role'
            }
        }

        #swagger.parameters['order'] = {
            in: 'query',
            description: 'Sort direction.',
            required: false,
            schema: {
                '@enum': ['asc', 'desc'],
                default: 'desc',
                example: 'desc'
            }
        }

        #swagger.parameters['role'] = {
            in: 'query',
            description: 'Filter project members by role.',
            required: false,
            schema: {
                '@enum': ['admin', 'project_admin', 'member'],
                example: 'member'
            }
        }

        #swagger.parameters['search'] = {
            in: 'query',
            description: 'Optional case-insensitive partial search across member username and full name.',
            required: false,
            '@schema': {
            type: 'string',
            maxLength: 100,
            example: 'rahul'
        }
        }

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
    const { page, limit, skip } = getPaginationOptions(req.query);
    const sortOptions = getSortOptions(req.query, ["role", "createdAt", "updatedAt",]);
    const { role } = req.query;
    const searchRegex = getSearchRegex(req.query.search)

    const project = await Project.findById(projectId)
    if (!project) {
        throw new ApiError(404, "Project not found")
    }

    const membersFilter = {
        project: new mongoose.Types.ObjectId(projectId),
    }
    if (role !== undefined) {
        if (
            typeof role !== "string" ||
            !AvailableUserRole.includes(role)
        ) {
            throw new ApiError(400, "Invalid project member role");
        }

        membersFilter.role = role;
    }


    const userLookupStages = [
        {
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
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                user: {
                    $arrayElemAt: ["$user", 0],
                },
            },
        },
    ];

    const memberSearchStages = searchRegex
        ? [
            {
                $match: {
                    $or: [
                        { "user.username": searchRegex },
                        { "user.fullName": searchRegex },
                    ],
                },
            },
        ]
        : [];

    const [projectMembers, totalMembers] = await Promise.all([
        ProjectMember.aggregate([
            {
                $match: membersFilter,
            },
            ...(searchRegex
                ? [...userLookupStages, ...memberSearchStages]
                : []),
            {
                $sort: sortOptions
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            },
            ...(!searchRegex ? userLookupStages : []),
            {
                $project: {
                    project: 1,
                    user: 1,
                    role: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    _id: 0,
                },
            },
        ]),
        searchRegex
            ? ProjectMember.aggregate([
                {
                    $match: membersFilter,
                },
                ...userLookupStages,
                ...memberSearchStages,
                {
                    $count: "totalMembers",
                },
            ]).then((result) => result[0]?.totalMembers ?? 0)
            : ProjectMember.countDocuments(membersFilter),
    ]);

    const totalPages = Math.ceil(totalMembers / limit);

    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const nextPage = hasNextPage ? page + 1 : null;
    const previousPage = hasPreviousPage ? page - 1 : null;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                members: projectMembers,
                pagination: {
                    currentPage: page,
                    limit,
                    totalMembers,
                    totalPages,
                    hasNextPage,
                    nextPage,
                    hasPreviousPage,
                    previousPage,
                },
            },
            "Project members fetched"
        )
    );

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

        #swagger.responses[409] = {
            description: 'Cannot demote the last project admin',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { projectId, userId } = req.params
    const { newRole } = req.body
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    if (!AvailableUserRole.includes(newRole)) {
        throw new ApiError(400, "Invalid role")
    }

    let projectMember = await ProjectMember.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId)
    })
    if (!projectMember) {
        throw new ApiError(404, "Project member not found")
    }

    if (
        projectMember.role === UserRolesEnum.ADMIN &&
        newRole !== UserRolesEnum.ADMIN
    ) {
        const otherAdminCount = await ProjectMember.countDocuments({
            project: new mongoose.Types.ObjectId(projectId),
            role: UserRolesEnum.ADMIN,
            _id: { $ne: projectMember._id }
        })

        if (otherAdminCount === 0) {
            throw new ApiError(
                409,
                "A project must have at least one admin"
            )
        }
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
            description: 'Invalid project ID',
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

        #swagger.responses[404] = {
            description: 'Project member not found',
            schema: {
                $ref: '#/components/schemas/ErrorResponse'
            }
        }
    */
    const { projectId, userId } = req.params
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    let projectMember = await ProjectMember.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId)
    })
    if (!projectMember) {
        throw new ApiError(400, "Project member not found")
    }

    if (projectMember.role === UserRolesEnum.ADMIN) {
        const otherAdminCount = await ProjectMember.countDocuments({
            project: new mongoose.Types.ObjectId(projectId),
            role: UserRolesEnum.ADMIN,
            _id: { $ne: projectMember._id }
        })

        if (otherAdminCount === 0) {
            throw new ApiError(
                409,
                "A project must have at least one admin"
            )
        }
    }

    projectMember = await ProjectMember.findByIdAndDelete(projectMember._id)
    if (!projectMember) {
        throw new ApiError(404, "Project member not found")
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