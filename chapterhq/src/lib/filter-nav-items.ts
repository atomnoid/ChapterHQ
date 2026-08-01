import type { SidebarNavItem } from "@/config/sidebar-nav";

/**
 * Filters the full sidebar navigation config down to only the items
 * the current user has permission to access.
 *
 * @param items   - Full list of SidebarNavItem from the config file.
 * @param userPermissions - Flat array of permission strings the user holds,
 *                          e.g. ["dashboard:read", "members:read", "finance:read"].
 * @returns       - Subset of items the user is allowed to see.
 */
export function filterNavItems(
  items: SidebarNavItem[],
  userPermissions: string[]
): SidebarNavItem[] {
  const permSet = new Set(userPermissions);

  return items.filter((item) => {
    // Items with no required permission are always visible.
    if (item.requiredPermission === null) return true;
    return permSet.has(item.requiredPermission);
  });
}
