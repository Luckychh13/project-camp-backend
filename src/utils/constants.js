// This file stores fixed values (like roles & statuses) in one place,
// so we don't repeat/misspell the same strings everywhere and can reuse them for validation.

export const UserRolesEnum={
    ADMIN:"admin",
    PROJECT_ADMIN:"project_admin",
    MEMBER:"member"
}

//we are sending basicaly the values of the keys in the array fromat
export const AvailableUserRole=Object.values(UserRolesEnum)

export const TaskStatusEnum={
    TODO:"todo",
    IN_PROGRESS:"in_progress",
    DONE:"done"
}

export const AvailableTaskStatus=Object.values(TaskStatusEnum)