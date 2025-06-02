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
  User2Icon,
} from "lucide-react"
import { LucideIcon } from "lucide-react"
import { VersionSwitcher } from "@/components/version-switcher"
import { useRouter } from "next/navigation"
import { useLoading } from "@/components/LoadingProvider"

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
  SidebarTrigger,
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
  const { role } = useUserRole();
  const router = useRouter();
  const { setLoading } = useLoading();

  // เมนูสำหรับ user ทุกคน
  const data = {
    versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
    navMain: [
      {
        title: "Getting Started",
        url: "#",
        items: [
          {
            title: "Installation",
            url: "#",
          },
          {
            title: "Project Structure",
            url: "#",
          },
        ],
      },
    ],
  };
  const userNav = [
    {
      title: "รายการหวย",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "รายการหวยทั้งหมด", url: "/", icon: GalleryVerticalEnd },
        { title: "รายการซื้อ", url: "/ticketpurchases", icon: BookOpen },
        { title: "ตรวจผลหวย", url: "/lottery-ticketresults", icon: PieChart },
        { title: "สรุปรายการหวย", url: "/lottery-summary", icon: Frame },
        { title: "ธุรกรรมเครดิต", url: "/transactions", icon: Command },
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
        { title: "เข้าสู่ระบบ Admin", url: "/admin/dashboard", icon: User2Icon }
      ],
    },
  ];

  const handleNavClick = (url: string) => {
    setLoading(true);
    router.push(url);
  };

  return (
    <Sidebar
      className="z-60"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <VersionSwitcher
          versions={["1.0.1", "1.1.0-alpha", "2.0.0-beta1"]}
          defaultVersion="1.0.1"
        />
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-1.5">
          {userNav[0].items.map((item) => (
            <button
              key={item.url}
              onClick={() => handleNavClick(item.url)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md hover:bg-primary/10 transition-colors duration-200 text-muted-foreground hover:text-primary"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span className="font-medium">{item.title}</span>
            </button>
          ))}
        </div>
        {role === "admin" && (
          <div className="mt-6 space-y-1.5">
            <div className="px-4 mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Admin Panel</h2>
            </div>
            {adminNav[0].items.map((item) => (
              <button
                key={item.url}
                onClick={() => handleNavClick(item.url)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md hover:bg-primary/10 transition-colors duration-200 text-muted-foreground hover:text-primary"
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span className="font-medium">{item.title}</span>
              </button>
            ))}
          </div>
        )}
        <NavProjects projects={[]} />
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center justify-between p-4">
          <NavUser />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[120px] z-[9999]" sideOffset={8}>
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer flex items-center gap-2">
                <span className="h-4 w-4">💻</span>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
