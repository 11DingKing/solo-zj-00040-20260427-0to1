import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useAppStore } from '@/store';
import { UserRole, IStore } from '@/types';
import { storeApi } from '@/services/api';
import {
  Calendar,
  Home,
  Users,
  Store,
  Clock,
  DollarSign,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  User,
  RefreshCw,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, currentStore, setCurrentStore } = useAuthStore();
  const { loading } = useAppStore();

  const [stores, setStores] = useState<IStore[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  const navItems: NavItem[] = [
    {
      path: '/dashboard',
      label: '仪表盘',
      icon: <Home className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      path: '/schedule',
      label: '排班管理',
      icon: <Calendar className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      path: '/my-schedule',
      label: '我的排班',
      icon: <Calendar className="w-5 h-5" />,
      roles: [UserRole.EMPLOYEE],
    },
    {
      path: '/stores',
      label: '门店管理',
      icon: <Store className="w-5 h-5" />,
      roles: [UserRole.ADMIN],
    },
    {
      path: '/employees',
      label: '员工管理',
      icon: <Users className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      path: '/attendance',
      label: '考勤管理',
      icon: <Clock className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      path: '/salary',
      label: '薪资管理',
      icon: <DollarSign className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      path: '/swap-requests',
      label: '换班申请',
      icon: <RefreshCw className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
  ];

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return;
      
      try {
        if (user.role === UserRole.ADMIN) {
          const result = await storeApi.getAll();
          if (result.success && result.stores) {
            setStores(result.stores as IStore[]);
            if (result.stores.length > 0 && !currentStore) {
              setCurrentStore(result.stores[0] as IStore);
            }
          }
        } else if (user.role === UserRole.MANAGER && user.managerProfile) {
          const managerStores = user.managerProfile.storeIds as unknown as IStore[];
          setStores(managerStores);
          if (managerStores.length > 0 && !currentStore) {
            setCurrentStore(managerStores[0]);
          }
        } else if (user.role === UserRole.EMPLOYEE && user.employeeProfile) {
          const employeeStores = user.employeeProfile.storeIds as unknown as IStore[];
          setStores(employeeStores);
          if (employeeStores.length > 0 && !currentStore) {
            setCurrentStore(employeeStores[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch stores:', error);
      }
    };

    fetchStores();
  }, [user, currentStore, setCurrentStore]);

  const filteredNavItems = navItems.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = (role: UserRole) => {
    const roleMap: Record<UserRole, string> = {
      [UserRole.ADMIN]: '总管理员',
      [UserRole.MANAGER]: '门店店长',
      [UserRole.EMPLOYEE]: '员工',
    };
    return roleMap[role];
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h1>智能排班</h1>
        </div>

        <nav className="sidebar-nav">
          {filteredNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
            <div className="avatar avatar-sm">{user ? getInitials(user.name) : '?'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.name || '未登录'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user ? getRoleLabel(user.role) : ''}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {filteredNavItems.find((item) => location.pathname === item.path)?.label || '仪表盘'}
            </h2>

            {currentStore && (user?.role !== UserRole.EMPLOYEE) && (
              <div className="relative">
                <button
                  onClick={() => setShowStoreSelector(!showStoreSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <Store className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{currentStore.name}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {showStoreSelector && (
                  <div className="dropdown-menu">
                    {stores.map((store) => (
                      <div
                        key={store._id}
                        onClick={() => {
                          setCurrentStore(store);
                          setShowStoreSelector(false);
                        }}
                        className={`dropdown-item ${currentStore._id === store._id ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        <Store className="w-4 h-4" />
                        <span>{store.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="avatar avatar-sm">{user ? getInitials(user.name) : '?'}</div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500">{user ? getRoleLabel(user.role) : ''}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {showUserMenu && (
                <div className="dropdown-menu">
                  <button className="dropdown-item">
                    <User className="w-4 h-4" />
                    <span>个人资料</span>
                  </button>
                  <button className="dropdown-item">
                    <Settings className="w-4 h-4" />
                    <span>设置</span>
                  </button>
                  <div className="divider"></div>
                  <button onClick={handleLogout} className="dropdown-item danger">
                    <LogOut className="w-4 h-4" />
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
