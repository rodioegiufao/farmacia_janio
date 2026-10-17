export const ALL_EXPLORER_TABS = Object.freeze(["models", "objects", "classes", "storeys", "networks", "parts"]);
export const RESTRICTED_EXPLORER_TABS = Object.freeze(["models", "storeys", "networks"]);
const PROFILE_EXPLORER_TABS = Object.freeze({
    admin: ALL_EXPLORER_TABS,
    colaborador: ALL_EXPLORER_TABS,
    cliente: RESTRICTED_EXPLORER_TABS
});

export function getViewerPermissions(user) {
    const profile = typeof user?.perfil === "string" ? user.perfil.trim().toLowerCase() : "";
    const permissions = PROFILE_PERMISSIONS[profile];
    return {
        canUseCollision: Boolean(permissions?.collision),
        canUseMaterials: Boolean(permissions?.materials),
        canTransformModels: Boolean(permissions?.transform)
        explorerTabs: [...(PROFILE_EXPLORER_TABS[profile] || RESTRICTED_EXPLORER_TABS)]   // NOVO
    };
}

export function isKnownViewerProfile(user) {
    return Object.hasOwn(PROFILE_PERMISSIONS, user?.perfil);
}
