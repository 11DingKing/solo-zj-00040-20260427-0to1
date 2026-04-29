import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useAppStore } from '@/store';
import { authApi } from '@/services/api';
import { UserRole, LoginCredentials } from '@/types';
import { Calendar, Clock, Users, Lock, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const { addNotification, setLoading } = useAppStore();

  const [formData, setFormData] = useState<LoginCredentials>({
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone || !formData.password) {
      addNotification('warning', '请输入手机号和密码');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.login(formData);
      
      if (result.success && result.token && result.user) {
        // 转换后端返回的用户数据格式，将 id 转换为 _id
        const userData = {
          ...result.user,
          _id: result.user.id,
          employeeProfile: result.user.employeeProfile || undefined,
          managerProfile: result.user.managerProfile || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        login(result.token, userData as IUser);
        addNotification('success', '登录成功！');
        
        if (userData.role === UserRole.EMPLOYEE) {
          navigate('/my-schedule');
        } else {
          navigate('/dashboard');
        }
      } else {
        addNotification('error', result.message || '登录失败');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '登录失败，请检查网络连接';
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setFormData({
      phone: 'admin',
      password: 'admin123',
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1>智能排班调度系统</h1>
          <p>请登录您的账户继续</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Users className="w-4 h-4 inline mr-2" />
              账号
            </label>
            <input
              type="text"
              name="phone"
              className="form-input"
              placeholder="请输入账号"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock className="w-4 h-4 inline mr-2" />
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input pr-10"
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">记住我</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg mb-4">
            <Clock className="w-5 h-5" />
            登录系统
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              点击填充演示账号（总管理员）
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-semibold text-blue-600">总管理员</div>
              <div>管理所有门店和员工</div>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <div className="font-semibold text-green-600">门店店长</div>
              <div>排班和考勤管理</div>
            </div>
            <div className="p-2 bg-purple-50 rounded">
              <div className="font-semibold text-purple-600">员工</div>
              <div>查看排班和打卡</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
