import {Router} from "express"
import {addMembersToProject,
    createProject,
    deleteMember,
    getProjectById,
    getProjects,
    deleteProject,
    getProjectMembers,
    updateMemberRole,
    updateProject
} from "../controllers/project.controllers.js"
import {validate} from "../middlewares/validator.middleware.js"
import { addMembertoProjectValidator, createProjectValidator } from "../validators/index.js"
import { verifyJWT, validateProjectPermissions} from "../middlewares/auth.middleware.js"
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js"

const router=Router()
router.use(verifyJWT)   //any route affter this line will have verifyJWT

router
   .route("/")
   .get(getProjects)
   .post(createProjectValidator(),validate,createProject)

router
    .route("/:projectId")
    .get(validateProjectPermissions(AvailableUserRole), getProjectById)
    .put(validateProjectPermissions([UserRolesEnum.ADMIN]),createProjectValidator(),validate,updateProject)
    .delete(validateProjectPermissions([UserRolesEnum.ADMIN]),deleteProject)

router
    .route("/:projectId/members")
    .get(validateProjectPermissions(AvailableUserRole),getProjectMembers)
    .post(validateProjectPermissions([UserRolesEnum.ADMIN]),addMembertoProjectValidator(),validate,addMembersToProject)

router
    .route("/:projectId/members/:userId")
    .put(validateProjectPermissions([UserRolesEnum.ADMIN]),updateMemberRole)    
    .delete(validateProjectPermissions([UserRolesEnum.ADMIN]),deleteMember)    
    
export default router