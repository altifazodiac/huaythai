"use client"

import * as React from "react"
import {
  GalleryVerticalEnd, BookOpen, PieChart, Frame, Command, User2Icon, ShieldCheck, Sun, Moon, Calendar, FileText
} from "lucide-react"
import { LucideIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useLoading } from "@/components/LoadingProvider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
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
import { NavUser } from "./nav-user"

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
    { title: "ตรวจผลหวย", url: "/results", icon: PieChart },
    { title: "ผลหวยล่าสุด", url: "/lottery-results", icon: Calendar },
    { title: "สรุปรายการหวย", url: "/lottery-summary", icon: Frame },
    { title: "รายงานหวย", url: "/lottery-report", icon: FileText },
    { title: "ธุรกรรมเครดิต", url: "/transactions", icon: Command },
  ]; //

  const adminNavItems: NavSubItem[] = [
    { title: "เข้าสู่ระบบ Admin", url: "/admin/dashboard", icon: User2Icon }
  ]; //

  const handleNavClick = (url: string) => {
    if (pathname === url) return;
    setLoading(true);
    router.push(url);
  }; //

  return (
    <Sidebar
      className={`z-50 bg-gradient-to-b from-red-800 to-red-950 shadow-xl transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`} //
      style={{ minHeight: '100vh' }}
      {...props}
    >
           <SidebarHeader className={`relative flex items-center justify-between px-3 py-4 bg-transparent overflow-hidden`}>
        {/* Gradient Background Layer */}
        {!collapsed && (
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 transform-gpu overflow-hidden blur-2xl"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#34d399] to-[#059669] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" // ลด opacity ลงเล็กน้อย
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-3 group">
            {/* --- โลโก้ --- */}
            <Image
              src="https://bqgiwmawqnixpgvuqhuc.supabase.co/storage/v1/object/public/images//Logo2.png"
              alt="logo"
              width={60}
              height={60}
              className={`
                rounded-full
                transition-all duration-700 ease-out
                transform
                group-hover:scale-125
                group-hover:rotate-[15deg]
                group-hover:shadow-2xl
                group-hover:shadow-red-500/40 /* ปรับสีเงาให้เข้มขึ้นเล็กน้อย */
                animate-fade-in-up 
              `}
              style={{ animationDelay: '0.2s' }}
            />
            {/* --- ข้อความ --- */}
            <div
              className={`
                text-lg font-bold
                text-gradient-red /* ใช้ custom class สำหรับ gradient text */
                transition-all duration-700 ease-out
                transform
                group-hover:scale-105
                hover:brightness-125 /* เมื่อ hover ที่ข้อความโดยตรง ให้สว่างขึ้น */
                animate-fade-in-left
              `}
              style={{ animationDelay: '0.4s' }}
            >
              สิงโตทองคำ 77
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={`pt-4 px-2 bg-transparent`}> {/* */}
        <div className="space-y-1"> {/* */}
          {userNavItems.map((item) => (
            <button
              key={item.url}
              onClick={() => handleNavClick(item.url)}
              className={`
                w-full flex items-center 
                ${collapsed ? 'justify-center' : 'px-3 gap-3'}  {/* ปรับ padding และ gap เมื่อไม่ collapsed */}
                py-2.5 rounded-lg
                transition-all duration-200 ease-in-out
                ${pathname === item.url
                  ? 'bg-red-600 text-white font-medium shadow-md' // Active: Dark red bg, white text //
                  : 'text-red-700 hover:bg-red-50 hover:text-red-800 focus:bg-red-100 focus:text-red-800 focus:outline-none dark:text-slate-50 dark:hover:bg-red-700 dark:hover:text-white dark:focus:bg-red-700 dark:focus:text-white' // Default: Dark red text on light bg, **ปรับเป็น text-slate-50 (เกือบขาว) ใน dark mode**
                }
                relative group
              `} //
              style={{ minHeight: '44px' }} //
            >
              {item.icon && (
                <item.icon
                  className={`h-5 w-5 flex-shrink-0  {/* เพิ่ม flex-shrink-0 ป้องกันการหดตัวของไอคอน */}
                    ${pathname === item.url
                      ? 'text-white' // Active icon: white //
                      : 'text-red-600 dark:text-red-300'} {/* Default icon: Darker red on light, **ปรับเป็น text-red-300 ใน dark mode** */}
                  `} //
                  strokeWidth={pathname === item.url ? 2.5 : 2} //
                />
              )}
              {!collapsed && (
                <span className={`font-normal text-sm tracking-tight text-left {/* เพิ่ม text-left */}
                  ${pathname === item.url
                    ? 'text-white' // Active text: white //
                    : 'inherit' // Inherits from button: text-red-700 dark:text-slate-50 //
                  }`}>
                  {item.title} {/* */}
                </span>
              )}
              {collapsed && (
                <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-red-950 border border-red-700/70 text-slate-100 text-xs rounded-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap shadow-lg z-50 transition-opacity duration-150 delay-200"> {/* */}
                  {item.title} {/* */}
                </span>
              )}
            </button>
          ))}
        </div>

        {role === "admin" && ( //
          <div className="mt-6 space-y-1"> {/* */}
            <div className={`px-2 mb-2 ${collapsed ? 'hidden' : ''}`}> {/* */}
              <h2 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Admin Panel</h2> {/* */}
            </div>
            {adminNavItems.map((item) => (
              <button
                key={item.url}
                onClick={() => handleNavClick(item.url)}
                className={`
                  w-full flex items-center
                  ${collapsed ? 'justify-center' : 'px-3 gap-3'} {/* ปรับ padding และ gap เมื่อไม่ collapsed */}
                  py-2.5 rounded-lg
                  transition-all duration-200 ease-in-out
                  ${pathname === item.url
                    ? 'bg-red-600 text-white font-medium shadow-md' //
                    : 'text-red-700 hover:bg-red-50 hover:text-red-800 focus:bg-red-100 focus:text-red-800 focus:outline-none dark:text-slate-50 dark:hover:bg-red-700 dark:hover:text-white dark:focus:bg-red-700 dark:focus:text-white' //
                  }
                  relative group
                `} //
                style={{ minHeight: '44px' }} //
              >
                {item.icon && (
                  <item.icon
                    className={`h-5 w-5 flex-shrink-0 {/* เพิ่ม flex-shrink-0 */}
                      ${pathname === item.url
                        ? 'text-white' //
                        : 'text-red-600 dark:text-red-300'} {/* */}
                    `} //
                    strokeWidth={pathname === item.url ? 2.5 : 2} //
                  />
                )}
                {!collapsed && (
                  <span className={`font-normal text-sm tracking-tight text-left {/* เพิ่ม text-left */}
                    ${pathname === item.url
                      ? 'text-white' //
                      : 'inherit' //
                    }`}>
                    {item.title} {/* */}
                  </span>
                )}
                {collapsed && (
                  <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-red-950 border border-red-700/70 text-slate-100 text-xs rounded-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap shadow-lg z-50 transition-opacity duration-150 delay-200"> {/* */}
                    {item.title} {/* */}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
       </SidebarContent>

      <SidebarFooter className={`border-t border-red-700/60 ${collapsed ? 'px-2' : 'px-3'} bg-transparent`}> {/* */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} py-3 w-full`}> {/* */}
          {!collapsed && (
            <NavUser />
          )}
         
          <DropdownMenu> {/* */}
          <DropdownMenuTrigger asChild>  
              <Button variant="ghost" size="icon" className="rounded-lg text-red-700 hover:bg-red-100 dark:text-red-200 dark:hover:text-white dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 data-[state=open]:bg-red-100 dark:data-[state=open]:bg-red-700">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[130px] z-[9999] bg-red-900 text-slate-100 border-red-700/70 shadow-xl" // Menu itself is dark //
              sideOffset={collapsed ? 12 : 8} //
            >
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer flex items-center text-red-700 gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100"> {/* */}
                <Sun className="h-4 w-4"  /> {/* */}
                Light {/* */}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100"> {/* */}
                <Moon className="h-4 w-4" /> {/* */}
                Dark {/* */}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer flex items-center text-red-700  gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100"> {/* */}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> {/* */}
                System {/* */}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
      <SidebarRail /> {/* */}
    </Sidebar>
  )
}