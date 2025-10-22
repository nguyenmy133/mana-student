import { 
  BarChart3, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  MessageCircle, 
  User,
  GraduationCap
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/schedule", label: "Lịch học", icon: Calendar },
  { path: "/tasks", label: "Task", icon: CheckSquare },
  { path: "/expenses", label: "Chi tiêu", icon: DollarSign },
  // SỬA Ở ĐÂY: Đổi path từ "/chat" thành "/chat-ai"
  { path: "/chat-ai", label: "Chat AI", icon: MessageCircle },
  { path: "/profile", label: "Hồ sơ", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center space-x-2 px-2 py-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          {!collapsed && <span className="text-xl font-bold text-primary">StudentLife</span>}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ path, label, icon: Icon }) => (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton asChild isActive={isActive(path)}>
                    <NavLink to={path}>
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}