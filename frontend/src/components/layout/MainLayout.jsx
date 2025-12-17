import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Users,
  FolderTree,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  GraduationCap,
  Bell,
  ChevronDown
} from 'lucide-react';

const MainLayout = ({ children }) => {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  const getRoleBadge = () => {
    const roles = {
      admin: { label: 'Administrador', color: 'bg-red-100 text-red-800' },
      teacher: { label: 'Profesor', color: 'bg-blue-100 text-blue-800' },
      editor: { label: 'Editor', color: 'bg-purple-100 text-purple-800' },
      student: { label: 'Estudiante', color: 'bg-green-100 text-green-800' }
    };
    return roles[user?.role] || roles.student;
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Inicio', roles: ['admin', 'teacher', 'editor', 'student'] },
    { path: '/courses', icon: BookOpen, label: 'Cursos', roles: ['admin', 'teacher', 'editor', 'student'] },
    { path: '/my-courses', icon: GraduationCap, label: 'Mis Cursos', roles: ['student'] },
    { path: '/categories', icon: FolderTree, label: 'Categorías', roles: ['admin'] },
    { path: '/users', icon: Users, label: 'Usuarios', roles: ['admin', 'teacher'] },
    { path: '/calendar', icon: Calendar, label: 'Calendario', roles: ['admin', 'teacher', 'editor', 'student'] },
    { path: '/messages', icon: MessageSquare, label: 'Mensajes', roles: ['admin', 'teacher', 'editor', 'student'] },
    { path: '/reports', icon: BarChart3, label: 'Informes', roles: ['admin', 'teacher'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || 'student')
  );

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 hidden sm:inline">
                Aula Virtual
              </span>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      getRoleBadge().color
                    )}>
                      {getRoleBadge().label}
                    </span>
                  </div>
                  <ChevronDown size={16} className="hidden md:block text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-16 left-0 bottom-0 bg-white border-r border-gray-200 z-40 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <ScrollArea className="h-full py-4">
          <nav className="px-2 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActivePath(item.path)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon size={20} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "pt-16 transition-all duration-300",
        sidebarOpen ? "lg:pl-64" : "lg:pl-16"
      )}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
