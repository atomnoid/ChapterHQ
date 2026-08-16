declare module 'lucide-react' {
  import { FC, SVGProps, ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }

  export type LucideIcon = ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>;

  // Define wild-card module exports using export as namespace or dynamic exports
  export const Clock: LucideIcon;
  export const MapPin: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Loader2: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const Mail: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const Award: LucideIcon;
  export const Trash2: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Layers: LucideIcon;
  export const Crown: LucideIcon;
  export const Plus: LucideIcon;
  export const ShieldOff: LucideIcon;
  export const UserCheck: LucideIcon;
  export const Users: LucideIcon;
  export const UserPlus: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const X: LucideIcon;
  export const Calendar: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Package: LucideIcon;
  export const Search: LucideIcon;
  export const Shield: LucideIcon;
  export const User: LucideIcon;
  export const FilePlus2: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const FileText: LucideIcon;
  export const Filter: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Archive: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Building2: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Edit2: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const BarChart3: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const CircleDollarSign: LucideIcon;
  export const Edit3: LucideIcon;
  export const Save: LucideIcon;
  export const LineChart: LucideIcon;
  export const TrendingUp: LucideIcon;
  
  // Wildcard fallback via interface merging/dynamic types
  export const BadgeCheck: LucideIcon;
  export const Landmark: LucideIcon;
  export const Wallet: LucideIcon;
  export const CircleCheckBig: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const LogOut: LucideIcon;
  export const Menu: LucideIcon;
  export const Settings: LucideIcon;
  export const Bell: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Briefcase: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const History: LucideIcon;
  export const ScrollText: LucideIcon;
  export const Pencil: LucideIcon;
  export const CheckSquare: LucideIcon;
  export const Download: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const ArrowDownRight: LucideIcon;
  export const FilePlus: LucideIcon;
  export const Activity: LucideIcon;
  export const XCircle: LucideIcon;
  export const Percent: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const PieChart: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const UserX: LucideIcon;
  export const Upload: LucideIcon;
  export const BellOff: LucideIcon;
  export const CheckCheck: LucideIcon;
  export const Send: LucideIcon;
  export const Key: LucideIcon;
  export const Edit3Icon: LucideIcon;
  export const Edit3Component: LucideIcon;
  export const Info: LucideIcon;
  export const Edit3Active: LucideIcon;
}
