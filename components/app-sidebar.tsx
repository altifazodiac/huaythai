"use client"

import * as React from "react"
import {
  // ... (your existing Lucide icon imports)
  GalleryVerticalEnd, BookOpen, PieChart, Frame, Command, User2Icon, ShieldCheck, Sun, Moon
} from "lucide-react"
import { LucideIcon } from "lucide-react"
import { VersionSwitcher } from "@/components/version-switcher"
import { useRouter, usePathname } from "next/navigation"
import { useLoading } from "@/components/LoadingProvider"
import { NavProjects } from "../components/nav-projects"
import { NavUser } from "../components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUserRole } from "@/hooks/use-user-role"
import Image from "next/image"

// Interface definitions (assuming they are correct)
interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setTheme } = useTheme();
  const { role } = useUserRole();
  const router = useRouter();
  const { setLoading } = useLoading();
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();

  const userNavItems: NavSubItem[] = [
    { title: "รายการหวยทั้งหมด", url: "/", icon: GalleryVerticalEnd },
    { title: "รายการซื้อ", url: "/ticketpurchases", icon: BookOpen },
    { title: "ตรวจผลหวย", url: "/lottery-ticketresults", icon: PieChart },
    { title: "สรุปรายการหวย", url: "/lottery-summary", icon: Frame },
    { title: "ธุรกรรมเครดิต", url: "/transactions", icon: Command },
  ];

  const adminNavItems: NavSubItem[] = [
    { title: "เข้าสู่ระบบ Admin", url: "/admin/dashboard", icon: User2Icon }
  ];

  const handleNavClick = (url: string) => {
    if (pathname === url) return;
    setLoading(true);
    router.push(url);
  };

  const handleToggleSidebar = () => setCollapsed((prev) => !prev);

  return (
    <Sidebar
      className={`z-50 bg-gradient-to-b from-blue-800 to-blue-950 text-slate-200 shadow-xl transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}
      
      style={{ minHeight: '100vh' }}
      {...props}
    >
      <SidebarHeader className={`flex items-center justify-between px-3 py-3.5  bg-transparent`}> 
        {!collapsed && (
         
           <div className="flex items-center gap-2">
            <Image src="https://bqgiwmawqnixpgvuqhuc.supabase.co/storage/v1/object/public/images//Logo.png" alt="logo" width={60} height={60} className="rounded-full border-shadow-lg" />
            <div className="text-md font-semibold text-blue-600 dark:text-white">หวยเศรษฐี 789</div> 
           </div>
        )}
      
      </SidebarHeader>

      <SidebarContent className={`pt-4 px-2 bg-transparent`}>  
        <div className="space-y-1">
          {userNavItems.map((item) => (
            <button
              key={item.url}
              onClick={() => handleNavClick(item.url)}
              className={`
                w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} 
                px-3 py-2.5 rounded-lg
                transition-all duration-200 ease-in-out
                ${pathname === item.url 
                  ? 'bg-blue-600 text-white font-medium shadow-md' // Active state: white text
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white focus:bg-blue-700 focus:text-white focus:outline-none'} // Inactive: light blue text, white on hover
                relative group
              `}
              style={{ minHeight: '44px' }}
            >
              {item.icon && (
                <item.icon
                  className={`h-5 w-5 ${pathname === item.url
                    ? 'text-blue-700 dark:text-white'
                    : 'text-blue-600 dark:text-white'} ${collapsed ? '' : 'mr-0.5'}`}
                  strokeWidth={pathname === item.url ? 2.5 : 2}
                />
              )}
              {!collapsed && (
                <span className={`font-normal text-sm tracking-tight 
                  ${pathname === item.url
                    ? 'text-blue-700 dark:text-white'
                    : 'text-blue-600 dark:text-white'}`}>
                  {item.title}
                </span>
              )}
              {collapsed && (
                <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-blue-950 border border-blue-700/70 text-slate-100 text-xs rounded-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap shadow-lg z-50 transition-opacity duration-150 delay-200">
                  {item.title}
                </span>
              )}
            </button>
          ))}
        </div>

        {role === "admin" && (
          <div className="mt-6 space-y-1">
            <div className={`px-2 mb-2 ${collapsed ? 'hidden' : ''}`}>
             
              <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Admin Panel</h2>
            </div>
            {adminNavItems.map((item) => (
              <button
                key={item.url}
                onClick={() => handleNavClick(item.url)}
                className={`
                  w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} 
                  px-3 py-2.5 rounded-lg
                  transition-all duration-200 ease-in-out
                  ${pathname === item.url 
                    ? 'bg-blue-600 text-blue-50 dark:text-white font-medium shadow-md' 
                    : 'text-blue-600 dark:text-white hover:bg-blue-700 hover:text-white focus:bg-blue-700 focus:text-white focus:outline-none'}
                  relative group
                `}
                style={{ minHeight: '44px' }}
              >
                {item.icon && (
                  <item.icon
                    className={`h-5 w-5 ${pathname === item.url
                      ? 'text-blue-600 dark:text-white'
                      : 'text-blue-600 dark:text-white'} ${collapsed ? '' : 'mr-0.5'}`}
                    strokeWidth={pathname === item.url ? 2.5 : 2}
                  />
                )}
                {!collapsed && (
                  <span className={`font-normal text-sm tracking-tight 
                    ${pathname === item.url
                      ? 'text-blue-600 dark:text-white'
                      : 'text-blue-600 dark:text-white'}`}>
                    {item.title}
                  </span>
                )}
                {collapsed && (
                  <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-blue-950 border border-blue-700/70 text-blue-100 dark:text-white text-xs rounded-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap shadow-lg z-50 transition-opacity duration-150 delay-200">
                    {item.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
       </SidebarContent>

      <SidebarFooter className={`border-t border-blue-700/60 ${collapsed ? 'px-2' : 'px-3'} bg-transparent`}> {/* ENSURE THIS IS TRANSPARENT */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} py-3 w-full`}>
          {!collapsed && <NavUser />} {/* Ensure NavUser component uses light text for "Admin admin@gmail.com" */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-lg text-slate-300 hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=open]:bg-blue-700">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-[130px] z-[9999] bg-blue-900 text-slate-100 border-blue-700/70 shadow-xl" 
              sideOffset={collapsed ? 12 : 8}
            >
             
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-blue-700 focus:!bg-blue-700 !text-slate-100">
                <Sun className="h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-blue-700 focus:!bg-blue-700 !text-slate-100">
                <Moon className="h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-blue-700 focus:!bg-blue-700 !text-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
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