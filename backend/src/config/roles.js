/**
 * Role model (v1.4.5 Phase 6).
 *
 * Admin-tier hierarchy: superadmin > admin > manager. `staff` is the separate
 * counter-operator role. Higher rank implies all lower-rank permissions.
 *
 * Backward compatible: existing `admin` accounts keep working; the env-configured
 * bootstrap admin is promoted to `superadmin` on boot.
 */
const ROLES = Object.freeze({
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
});

const RANK = Object.freeze({ superadmin: 3, admin: 2, manager: 1, staff: 0 });
const ADMIN_TIER = ['superadmin', 'admin', 'manager'];

function isAdminTier(role) {
  return ADMIN_TIER.includes(role);
}

function atLeast(role, minRole) {
  return (RANK[role] || 0) >= (RANK[minRole] || 0);
}

module.exports = { ROLES, RANK, ADMIN_TIER, isAdminTier, atLeast };
