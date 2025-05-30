"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  HomeIcon,
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
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setTheme } = useTheme();

  // This is sample data.
  const data = {
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "หวยออนไลน์",
        logo: GalleryVerticalEnd,
        plan: "HuayOnline",
      },
      {
        name: "มาเฟียพารวย",
        logo: AudioWaveform,
        plan: "Startup",
      },
      {
        name: "หวยเศรษฐี",
        logo: Command,
        plan: "Free",
      },
    ],
    mainNav: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: HomeIcon,
        isActive: true,
        items: [
          {
            title: "Dashboard",
            url: "/dashboard",
          },
        ],
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
            url: "/admin/lottery-results",
          },
          {
            title: "จัดการผู้ใช้",
            url: "/admin/users",
          },
          {
            title: "รายงาน",
            url: "/admin/reports",
          },
          {
            title: "รายการที่ลบ",
            url: "/admin/lottery-ticket",
          },
          {
            title: "จัดการชนิดย่อยของหวย",
            url: "/admin/lotterysubtype",
          },
        ],
      },
    ] as NavItem[],
    navMain: [
      {
        title: "รายการหวย",
        url: "#",
        icon: SquareTerminal,
        isActive: true,
        items: [
          {
            title: "รายการหวยทั้งหมด",
            url: "/",
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
            url: "/lottery-results",
          },
          {
            title: "ผลหวยย้อนหลัง",
            url: "#",
          },
          {
            title: "การจ่ายรางวัล",
            url: "/huaythaigroup",
          },
          {
            title: "การจ่ายรางวัลย้อนหลัง",
            url: "/lottery-winnings-report",
          },
          {
            title: "สรุปรายงาน",
            url: "/lottery-summary",
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
        <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
