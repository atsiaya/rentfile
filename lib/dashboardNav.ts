import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  FileText,
  Home,
  MessageSquare,
  Receipt,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    items: [
      { key: "home", label: "Home", icon: Home, href: "/dashboard" },
      { key: "tenants", label: "Tenants", icon: Users, href: "/dashboard/tenants" },
    ],
  },
  {
    heading: "Rent",
    items: [
      { key: "collectRent", label: "Collect Rent", icon: Banknote, href: "/dashboard/collect" },
      { key: "autopay", label: "Autopay", icon: Zap, href: "/dashboard/autopay" },
      { key: "ledger", label: "Ledger", icon: Receipt, href: "/dashboard/ledger" },
      { key: "reminders", label: "Reminders", icon: Bell, href: "/dashboard/reminders" },
    ],
  },
  {
    items: [
      { key: "maintenance", label: "Maintenance", icon: Wrench, href: "/dashboard/maintenance" },
      { key: "messages", label: "Messages", icon: MessageSquare, href: "/dashboard/messages" },
      { key: "documents", label: "Documents", icon: FileText, href: "/dashboard/documents" },
    ],
  },
];

export const allNavItems: NavItem[] = navSections.flatMap((s) => s.items);

/** Maps the current pathname to a nav key, so the layout can gate access per-section. */
export function keyForPath(pathname: string): string | null {
  if (pathname === "/dashboard") return "home";
  const match = allNavItems.find(
    (item) => item.href !== "/dashboard" && pathname.startsWith(item.href)
  );
  return match?.key ?? null;
}
