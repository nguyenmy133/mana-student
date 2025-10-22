import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  MessageCircle, 
  User,
  GraduationCap
} from "lucide-react";

const navItems = [
  // SỬA Ở ĐÂY: Đổi path của Dashboard từ "/" thành "/dashboard"
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/schedule", label: "Lịch học", icon: Calendar },
  { path: "/tasks", label: "Task", icon: CheckSquare },
  { path: "/expenses", label: "Chi tiêu", icon: DollarSign },
  // SỬA Ở ĐÂY: Đổi path từ "/chat" thành "/chat-ai"
  { path: "/chat-ai", label: "Chat AI", icon: MessageCircle },
  { path: "/profile", label: "Hồ sơ", icon: User },
];

export const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">StudentLife</span>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};