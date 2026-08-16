import {
  Award,
  Bell,
  Briefcase,
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileText,
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SidebarNavItem {
  title: string;
  route: string;
  icon: LucideIcon;
  /**
   * The permission string required to render this item (format: "resource:action").
   * If null the item is always visible to any authenticated user.
   */
  requiredPermission: string | null;
}

/**
 * Canonical sidebar navigation configuration.
 * Order here defines render order.
 * requiredPermission is the minimum read-level permission for the module.
 */
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    title: "Dashboard",
    route: "/dashboard",
    icon: LayoutDashboard,
    requiredPermission: "dashboard:read",
  },
  {
    title: "Members",
    route: "/members",
    icon: Users,
    requiredPermission: "members:read",
  },
  {
    title: "Core Members",
    route: "/core-members",
    icon: Shield,
    requiredPermission: "members:read",
  },
  {
    title: "Roles",
    route: "/roles",
    icon: Shield,
    requiredPermission: "roles:read",
  },
  {
    title: "Committees",
    route: "/committees",
    icon: Briefcase,
    requiredPermission: "committees:read",
  },
  {
    title: "Appointments",
    route: "/appointments",
    icon: ClipboardList,
    requiredPermission: "appointments:read",
  },
  {
    title: "Events",
    route: "/events",
    icon: CalendarDays,
    requiredPermission: "events:read",
  },
  {
    title: "Attendance",
    route: "/attendance",
    icon: Users,
    requiredPermission: "attendance:read",
  },
  {
    title: "Finance",
    route: "/finance",
    icon: DollarSign,
    requiredPermission: "finance:read",
  },
  {
    title: "Inventory",
    route: "/inventory",
    icon: Package,
    requiredPermission: "inventory:read",
  },
  {
    title: "Documents",
    route: "/documents",
    icon: FileText,
    requiredPermission: "documents:read",
  },
  {
    title: "Forms",
    route: "/forms",
    icon: ClipboardList,
    requiredPermission: "forms:read",
  },
  {
    title: "Certificates",
    route: "/certificates",
    icon: Award,
    requiredPermission: "certificates:read",
  },
  {
    title: "Notifications",
    route: "/notifications",
    icon: Bell,
    requiredPermission: "notifications:read",
  },
  {
    title: "Reports",
    route: "/reports",
    icon: ClipboardList,
    requiredPermission: "reports:read",
  },
  {
    title: "Audit Logs",
    route: "/audit-logs",
    icon: ScrollText,
    requiredPermission: "audit-logs:read",
  },
  {
    title: "Settings",
    route: "/settings",
    icon: Settings,
    requiredPermission: "settings:read",
  },
];
