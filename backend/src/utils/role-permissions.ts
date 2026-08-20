
export const UserRole = {
  USER: "USER",
  PREMIUM: "PREMIUM", 
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN"
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.PREMIUM]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3,
};

export const hasRoleOrHigher = (
  userRole: UserRole,
  requiredRole: UserRole
): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export type RolePermissions = {
  monthlyMessageLimit: number;
  allowedModels: string[];
  canAccessAdminPanel: boolean;
  canAccessChat: boolean;
};

export const getRolePermissions = (role: UserRole): RolePermissions => {
  switch (role) {
    case UserRole.USER:
      return {
        monthlyMessageLimit: 100,
        allowedModels: ["gpt-3.5-turbo", "gpt-4o-mini"],
        canAccessAdminPanel: false,
        canAccessChat: false,
      };
    case UserRole.PREMIUM:
      return {
        monthlyMessageLimit: 1000,
        allowedModels: ["gpt-3.5-turbo", "gpt-4", "gpt-4o-mini"],
        canAccessAdminPanel: false,
        canAccessChat: false,
      };
    case UserRole.ADMIN:
      return {
        monthlyMessageLimit: -1, // Unlimited
        allowedModels: ["gpt-3.5-turbo", "gpt-4", "claude-3", "gpt-4o-mini"],
        canAccessAdminPanel: true,
        canAccessChat: true,
      };
    case UserRole.SUPER_ADMIN:
      return {
        monthlyMessageLimit: -1, // Unlimited
        allowedModels: ["gpt-3.5-turbo", "gpt-4", "claude-3", "gpt-4-turbo", "gpt-4o-mini"],
        canAccessAdminPanel: true,
        canAccessChat: true,
      };
    default:
      return getRolePermissions("USER");
  }
};

export const canAccessAdminPanel = (role: UserRole): boolean => {
  return hasRoleOrHigher(role, UserRole.ADMIN);
};

export const canManageUsers = (role: UserRole): boolean => {
  return hasRoleOrHigher(role, UserRole.ADMIN);
};

export const canManageSystem = (role: UserRole): boolean => {
  return hasRoleOrHigher(role, UserRole.SUPER_ADMIN);
};

export const isUnlimitedRole = (role: UserRole): boolean => {
  return hasRoleOrHigher(role, UserRole.ADMIN);
};
