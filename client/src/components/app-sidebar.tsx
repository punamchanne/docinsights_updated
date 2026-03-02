import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Upload,
  FileText,
  MessageSquare,
  BarChart3,
  ChevronUp,
  LogOut,
  User,
  Zap
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Upload",
    url: "/upload",
    icon: Upload,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FileText,
  },
  {
    title: "Chat Analysis",
    url: "/documents", // Intentionally points to documents list where chat is accessed
    icon: MessageSquare,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth(); // Use logoutMutation from hook

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email || "User";
  };

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="h-16 px-6 flex items-center border-b">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground transition-all">DocInsight</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2 px-3">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                      className={`h-10 px-3 rounded-lg transition-all duration-200 ${isActive
                        ? "bg-primary/10 text-primary font-medium border border-primary/10"
                        : "hover:bg-muted/50 hover:text-foreground"
                        }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border"
              data-testid="button-user-menu"
            >
              <Avatar className="h-9 w-9 border border-border shadow-sm">
                <AvatarImage
                  src={user?.profileImageUrl || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted text-foreground font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{getUserName()}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 p-2 shadow-lg border bg-popover">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              My Account
            </div>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem asChild className="focus:bg-primary/10 cursor-pointer rounded-md">
              <Link href="/profile" className="flex items-center gap-2">
                <User className="w-4 h-4 mr-2" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              className="focus:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer rounded-md"
              onClick={handleLogout} // Use handleLogout for smoother experience
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
