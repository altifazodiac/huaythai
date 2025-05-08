"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  ShieldCheck,
  SquareTerminal,
} from "lucide-react"
import { LucideIcon } from "lucide-react"

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavSubItem[];
}

interface NavSubItem {
  title: string;
  url: string;
}

import { NavMain } from "../components/nav-main"
import { NavProjects } from "../components/nav-projects"
import { NavUser } from "../components/nav-user"
import { TeamSwitcher } from "../components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  mainNav: [
    {
      title: "Dashboard",
      url: "/dashboard",
    },
    {
      title: "ผู้ดูแลระบบ",
      url: "/admin",
      icon: ShieldCheck,
      items: [
        {
          title: "แดชบอร์ด",
          url: "/admin",
        },
        {
          title: "จัดการผลสลาก",
          url: "/admin/lottery",
        },
        {
          title: "จัดการผู้ใช้",
          url: "/admin/users",
        },
        {
          title: "รายงาน",
          url: "/admin/reports",
        },
      ],
    },
  ] as NavItem[],
  navMain: [
    {
      title: "หวยไทย",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "ซื้อหวยไทย",
          url: "/huaythai",
        },
        {
          title: "รายการซื้อ",
          url: "/ticketpurchases",
        },
        {
          title: "ตรวจผลหวย",
          url: "/huayresults",
        },
        {
          title: "ผลสลากกินแบ่ง",
          url: "/huaylatestresults",
        },
        {
          title: "ผลหวยย้อนหลัง",
          url: "#",
        },
        {
          title: "การจ่ายรางวัล",
          url: "/huaythaigroup",
        },
      ],
    },
    {
      title: "หวยหุ้น",
      url: "#",
      icon: SquareTerminal,
      items: [
        {
          title: "ซื้อหวยหุ้น",
          url: "#",
        },
        {
          title: "รายการซื้อหวยหุ้น",
          url: "#",
        },
        {
          title: "ตรวจผลหวยหุ้น",
          url: "#",
        },
        {
          title: "ผลหวยหุ้นย้อนหลัง",
          url: "#",
        },
      ],
    },
    {
      title: "หวยลาว",
      url: "#",
      icon: SquareTerminal,
      items: [
        {
          title: "ซื้อหวยลาว",
          url: "#",
        },
        {
          title: "รายการซื้อหวยลาว",
          url: "#",
        },
        {
          title: "ตรวจผลหวยลาว",
          url: "#",
        },
        {
          title: "ผลหวยลาวย้อนหลัง",
          url: "#",
        },
      ],
    },
    {
      title: "หวยฮานอย",
      url: "#",
      icon: SquareTerminal,
      items: [
        {
          title: "ซื้อหวยฮานอย",
          url: "#",
        },
        {
          title: "รายการซื้อหวยฮานอย",
          url: "#",
        },
        {
          title: "ตรวจผลหวยฮานอย",
          url: "#",
        },
        {
          title: "ผลหวยฮานอยย้อนหลัง",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },

    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ] as NavItem[],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.mainNav as NavItem[]} />
        <NavMain items={data.navMain as NavItem[]} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
