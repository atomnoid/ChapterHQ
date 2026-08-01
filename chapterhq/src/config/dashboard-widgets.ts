import {
  Users,
  Shield,
  Briefcase,
  CalendarDays,
  UserCheck,
  DollarSign,
  Package,
  Award,
  FileText,
  ClipboardList,
  Bell,
  History,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  permission: string;
  route: string;
  icon: LucideIcon;
  apiSource: string | null;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    id: "members",
    title: "Members",
    description: "Manage roster list, details, and access control permissions.",
    permission: "members:read",
    route: "/members",
    icon: Users,
    apiSource: "/api/members",
  },
  {
    id: "roles",
    title: "Roles",
    description: "Configure dynamic scope definitions and access control keys.",
    permission: "roles:read",
    route: "/roles",
    icon: Shield,
    apiSource: "/api/roles",
  },
  {
    id: "committees",
    title: "Committees",
    description: "Orchestrate committee operations and dynamic staff structures.",
    permission: "committees:read",
    route: "/committees",
    icon: Briefcase,
    apiSource: "/api/committees",
  },
  {
    id: "events",
    title: "Events",
    description: "Create and list organization schedules, venues, and status logs.",
    permission: "events:read",
    route: "/events",
    icon: CalendarDays,
    apiSource: "/api/events",
  },
  {
    id: "attendance",
    title: "Attendance",
    description: "Mark presence, print logs, and retrieve meeting sign-ins.",
    permission: "attendance:read",
    route: "/attendance",
    icon: UserCheck,
    apiSource: "/api/attendance",
  },
  {
    id: "finance",
    title: "Finance",
    description: "Retrieve income summary balances and manage ledger records.",
    permission: "finance:read",
    route: "/finance",
    icon: DollarSign,
    apiSource: "/api/finance/summary",
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "Register and audit organization assets, quantities, and status.",
    permission: "inventory:read",
    route: "/inventory",
    icon: Package,
    apiSource: "/api/inventory",
  },
  {
    id: "certificates",
    title: "Certificates",
    description: "Design templates, generate honors, and sign credential records.",
    permission: "certificates:read",
    route: "/certificates",
    icon: Award,
    apiSource: "/api/certificates",
  },
  {
    id: "documents",
    title: "Documents",
    description: "Store files, templates, and read structural folders.",
    permission: "documents:read",
    route: "/documents",
    icon: FileText,
    apiSource: "/api/documents",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Review attendance analysis metrics and custom export logs.",
    permission: "reports:read",
    route: "/reports",
    icon: ClipboardList,
    apiSource: null,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Track system updates and active member inbox reports.",
    permission: "notifications:read",
    route: "/notifications",
    icon: Bell,
    apiSource: "/api/notifications",
  },
  {
    id: "audit-logs",
    title: "Audit Logs",
    description: "Access system activities, updates, and chronological changes.",
    permission: "audit-logs:read",
    route: "/audit-logs",
    icon: History,
    apiSource: "/api/audit-logs",
  },
  {
    id: "settings",
    title: "Organization Settings",
    description: "Configure details, update slugs, and delete spaces.",
    permission: "settings:read",
    route: "/settings",
    icon: Settings,
    apiSource: "/api/organization/settings",
  },
];
