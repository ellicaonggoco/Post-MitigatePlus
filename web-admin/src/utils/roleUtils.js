// Role constants
export const ROLES = {
  LGU_SUPERADMIN: 'lgu_superadmin',
  LGU_ADMIN: 'lgu_admin',
  BARANGAY_OFFICIAL: 'barangay_official',
};

export const canSeeCityWide = (user) =>
  [ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN].includes(user?.role);

export const canSeeBarangayOnly = (user) =>
  user?.role === ROLES.BARANGAY_OFFICIAL;

export const canProvisionAdmins = (user) =>
  user?.role === ROLES.LGU_SUPERADMIN;

export const canProvisionStaff = (user) =>
  user?.role === ROLES.LGU_ADMIN;

export const canAccessCityOps = (user) =>
  [ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN].includes(user?.role);

export const isBarangayOfficial = (user) =>
  user?.role === ROLES.BARANGAY_OFFICIAL;

export const isLguAdmin = (user) =>
  user?.role === ROLES.LGU_ADMIN;

export const isLguSuperAdmin = (user) =>
  user?.role === ROLES.LGU_SUPERADMIN;

export const getRoleLabel = (role) => {
  switch (role) {
    case ROLES.LGU_SUPERADMIN: return 'LGU Super Admin';
    case ROLES.LGU_ADMIN: return 'LGU Admin';
    case ROLES.BARANGAY_OFFICIAL: return 'Barangay Official';
    default: return 'User';
  }
};
