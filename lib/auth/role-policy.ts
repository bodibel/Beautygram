export const USER_ROLES = ["visitor", "provider", "admin"] as const
export const PUBLIC_REGISTRATION_ROLES = ["visitor", "provider"] as const

export type UserRole = (typeof USER_ROLES)[number]
export type PublicRegistrationRole = (typeof PUBLIC_REGISTRATION_ROLES)[number]

interface AdminRolePolicyInput {
    targetUserId: string
    currentAdminId: string
    adminCount: number
}

interface AdminDeletePolicyInput extends AdminRolePolicyInput {
    targetRole: string
}

interface AdminDeactivatePolicyInput {
    targetUserId: string
    currentAdminId: string
    targetRole: string
    isTargetActive: boolean
    activeAdminCount: number
}

interface PolicyResult {
    allowed: boolean
    error?: string
}

export function isUserRole(role: string): role is UserRole {
    return USER_ROLES.includes(role as UserRole)
}

export function isPublicRegistrationRole(role: string): role is PublicRegistrationRole {
    return PUBLIC_REGISTRATION_ROLES.includes(role as PublicRegistrationRole)
}

export function canRemoveAdminRole(input: AdminRolePolicyInput): PolicyResult {
    if (input.targetUserId === input.currentAdminId) {
        return { allowed: false, error: "Nem távolíthatod el a saját admin szerepkörödet." }
    }

    if (input.adminCount <= 1) {
        return { allowed: false, error: "Az utolsó admin fiók admin szerepköre nem távolítható el." }
    }

    return { allowed: true }
}

export function canDeleteAdminUser(input: AdminDeletePolicyInput): PolicyResult {
    if (input.targetUserId === input.currentAdminId) {
        return { allowed: false, error: "Nem törölheted a saját admin fiókodat." }
    }

    if (input.targetRole === "admin" && input.adminCount <= 1) {
        return { allowed: false, error: "Az utolsó admin fiók nem törölhető." }
    }

    return { allowed: true }
}

export function canDeactivateAdminUser(input: AdminDeactivatePolicyInput): PolicyResult {
    if (!input.isTargetActive) {
        return { allowed: true }
    }

    if (input.targetUserId === input.currentAdminId) {
        return { allowed: false, error: "Nem inaktiválhatod a saját admin fiókodat." }
    }

    if (input.targetRole === "admin" && input.activeAdminCount <= 1) {
        return { allowed: false, error: "Az utolsó aktív admin fiók nem inaktiválható." }
    }

    return { allowed: true }
}
