import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  BarChart3,
  UserCircle,
  Image,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  Bell,
} from 'lucide-react';
import { useState, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Personas', href: '/personas', icon: Users },
  { name: 'Content Studio', href: '/content/studio', icon: FileText },
  { name: 'My Content', href: '/content/history', icon: FileText },
  { name: 'Trend Explorer', href: '/trends', icon: TrendingUp },
  { name: 'Competitors', href: '/competitors', icon: BarChart3 },
  { name: 'Profile Audit', href: '/audit', icon: UserCircle },
  { name: 'Image Generator', href: '/images', icon: Image },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',
          'bg-card border-r border-border'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">LI</span>
              </div>
              <span className="font-semibold text-lg">Content AI</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="border-t border-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback>{user?.name?.[0] || user?.email[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{user?.name || user?.email}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                  {resolvedTheme === 'dark' ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  Toggle Theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'ml-64' : 'ml-0'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 sm:px-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarOpen ? "Close sidebar" : "Open sidebar"}
            </TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                  3
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<div className="flex h-full min-h-[50vh] items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
