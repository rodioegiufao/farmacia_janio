const PROFILE_PERMISSIONS = Object.freeze({
    admin: Object.freeze({ collision: true, materials: true, transform: true }),
    colaborador: Object.freeze({ collision: true, materials: true, transform: true }),
    cliente: Object.freeze({ collision: false, materials: false, transform: false })
});

export function getViewerPermissions(user) {
    const profile = typeof user?.perfil === "string" ? user.perfil.trim().toLowerCase() : "";
    const permissions = PROFILE_PERMISSIONS[profile];
    return {
        canUseCollision: Boolean(permissions?.collision),
        canUseMaterials: Boolean(permissions?.materials),
        canTransformModels: Boolean(permissions?.transform)
    };
}

export function isKnownViewerProfile(user) {
    return Object.hasOwn(PROFILE_PERMISSIONS, user?.perfil);
}