import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  BarChart3, 
  LayoutDashboard, 
  Receipt, 
  Settings, 
  LogOut,
  ChevronRight
} from 'lucide-react';

const mainNavItems = [
  { 
    to: '/dashboard', 
    icon: LayoutDashboard, 
    label: 'Budget Overview',
    description: 'Monitor budgets'
  },
  { 
    to: '/spend-entry', 
    icon: Receipt, 
    label: 'Spend Tracking',
    description: 'Track spending'
  },
];

const secondaryNavItems = [
  { 
    to: '/simulation', 
    icon: Settings, 
    label: 'Settings',
    description: 'Configure'
  },
];

const dataSources = [
  { name: 'LinkedIn', color: 'bg-linkedin', active: true },
  { name: 'Google', color: 'bg-google', active: true },
  { name: 'Meta', color: 'bg-meta', active: true },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border/50 flex flex-col z-50">
      {/* Logo Section */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-foreground text-lg leading-tight">
              Brightvision
            </h1>
            <p className="text-xs text-muted-foreground">Internal Tools</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Main
          </p>
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className={`w-4 h-4 opacity-0 -translate-x-2 transition-all ${isActive ? 'opacity-100 translate-x-0' : 'group-hover:opacity-50 group-hover:translate-x-0'}`} />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Data Sources Section */}
        <div className="mt-6 space-y-1">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Data Sources
          </p>
          <div className="space-y-1">
            {dataSources.map((source) => (
              <div
                key={source.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
              >
                <div className={`w-3 h-3 rounded-full ${source.color}`} />
                <span className="flex-1 text-muted-foreground">{source.name}</span>
                {source.active && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs text-success">Active</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Secondary Navigation */}
        <div className="mt-6 space-y-1">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            System
          </p>
          {secondaryNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user ? getInitials(user.name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role === 'admin' ? 'Administrator' : 'Viewer'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Logga ut"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
