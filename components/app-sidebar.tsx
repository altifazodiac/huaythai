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
import { useUserRole } from "@/hooks/use-user-role"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setTheme } = useTheme();
  const { role, loading } = useUserRole();

  // เมนูสำหรับ user ทุกคน
  const userNav = [
    {
      title: "รายการหวย",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "รายการหวยทั้งหมด", url: "/" },
        { title: "รายการซื้อ", url: "/ticketpurchases" },
        { title: "ตรวจผลหวย", url: "/lottery-ticketresults" },
        { title: "การจ่ายรางวัล", url: "/lottery-summary" },
        { title: "ประวัติการสั่งซื้อ", url: "/transactions" },
      ],
    },
    
  ];

  // เมนูสำหรับ admin เท่านั้น
  const adminNav = [
    {
      title: "ผู้ดูแลระบบ",
      url: "/admin",
      icon: ShieldCheck,
      items: [
        { title: "จัดการระบบ", url: "/admin/dashboard" }
       
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={[]} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={userNav} />
        {role === "admin" && <NavMain items={adminNav} />}
        <NavProjects projects={[]} />
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
