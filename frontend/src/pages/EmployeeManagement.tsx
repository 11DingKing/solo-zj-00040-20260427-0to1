import React, { useState, useEffect } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { userApi, storeApi } from '@/services/api';
import { IUser, IStore, UserRole, EmploymentType } from '@/types';
import { Plus, Edit, Trash2, Users, Phone, Briefcase, Search } from 'lucide-react';
import { formatCurrency, getEmploymentTypeText, getRoleText } from '@/utils';

const EmployeeManagement: React.FC = () => {
  const { user, currentStore } = useAuthStore();
  const { setLoading, addNotification } = useAppStore();

  const [employees, setEmployees] = useState<IUser[]>([]);
  const [stores, setStores] = useState<IStore[]>([]);
  const [loading, setLocalLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<IUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: UserRole.EMPLOYEE,
    employeeProfile: {
      employmentType: EmploymentType.FULL_TIME,
      hourlyRate: 0,
      storeIds: [] as string[],
      skillTags: [] as string[],
    },
  });

  useEffect(() => {
    fetchData();
  }, [currentStore]);

  const fetchData = async () => {
    setLocalLoading(true);
    try {
      const storeId = selectedStore || currentStore?._id;
      const [employeesResult, storesResult] = await Promise.all([
        userApi.getEmployees(storeId, searchTerm),
        user?.role === UserRole.ADMIN ? storeApi.getAll() : null,
      ]);

      if (employeesResult.success && employeesResult.employees) {
        setEmployees(employeesResult.employees as IUser[]);
      }

      if (storesResult?.success && storesResult.stores) {
        setStores(storesResult.stores as IStore[]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addNotification('error', '获取数据失败');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingEmployee) {
        const result = await userApi.updateEmployee(editingEmployee._id, formData as any);
        if (result.success) {
          addNotification('success', '员工信息更新成功');
          fetchData();
          closeModal();
        } else {
          addNotification('error', result.message || '更新失败');
        }
      } else {
        const result = await userApi.updateEmployee('new', formData as any);
        addNotification('success', '员工创建成功');
        fetchData();
        closeModal();
      }
    } catch (error) {
      console.error('Failed to save employee:', error);
      addNotification('error', '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee: IUser) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      phone: employee.phone,
      password: '',
      role: employee.role,
      employeeProfile: {
        employmentType: employee.employeeProfile?.employmentType || EmploymentType.FULL_TIME,
        hourlyRate: employee.employeeProfile?.hourlyRate || 0,
        storeIds: employee.employeeProfile?.storeIds.map((s: any) => typeof s === 'string' ? s : s._id) || [],
        skillTags: employee.employeeProfile?.skillTags || [],
      },
    });
    setShowModal(true);
  };

  const handleDelete = async (employeeId: string) => {
    if (!window.confirm('确定要删除这个员工吗？')) return;

    setLoading(true);
    try {
      const result = await userApi.delete(employeeId);
      if (result.success) {
        addNotification('success', '员工删除成功');
        fetchData();
      } else {
        addNotification('error', result.message || '删除失败');
      }
    } catch (error) {
      addNotification('error', '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData({
      name: '',
      phone: '',
      password: '',
      role: UserRole.EMPLOYEE,
      employeeProfile: {
        employmentType: EmploymentType.FULL_TIME,
        hourlyRate: 0,
        storeIds: [],
        skillTags: [],
      },
    });
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">员工管理</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="form-input pl-10 w-64"
              placeholder="搜索员工..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            添加员工
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>员工</th>
                  <th>电话</th>
                  <th>角色</th>
                  <th>用工类型</th>
                  <th>时薪</th>
                  <th>技能标签</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm">{employee.name.charAt(0).toUpperCase()}</div>
                        <span className="font-medium">{employee.name}</span>
                      </div>
                    </td>
                    <td>{employee.phone}</td>
                    <td>
                      <span className={`badge ${employee.role === UserRole.MANAGER ? 'badge-primary' : 'badge-secondary'}`}>
                        {getRoleText(employee.role)}
                      </span>
                    </td>
                    <td>
                      {employee.employeeProfile && (
                        <span
                          className={`badge ${
                            employee.employeeProfile.employmentType === EmploymentType.FULL_TIME
                              ? 'badge-success'
                              : 'badge-warning'
                          }`}
                        >
                          {getEmploymentTypeText(employee.employeeProfile.employmentType)}
                        </span>
                      )}
                    </td>
                    <td>
                      {employee.employeeProfile && (
                        <span className="font-semibold">
                          {formatCurrency(employee.employeeProfile.hourlyRate)}/小时
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {employee.employeeProfile?.skillTags?.map((tag, index) => (
                          <span key={index} className="badge badge-secondary text-xs">
                            {tag}
                          </span>
                        ))}
                        {(!employee.employeeProfile?.skillTags || employee.employeeProfile.skillTags.length === 0) && (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="empty-state">
              <Users className="empty-state-icon" />
              <p className="text-gray-500">暂无员工数据</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingEmployee ? '编辑员工' : '添加员工'}</h3>
              <button onClick={closeModal} className="modal-close">
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">姓名 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="请输入姓名"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">手机号 *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="请输入手机号"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                {!editingEmployee && (
                  <div className="form-group">
                    <label className="form-label">初始密码 *</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="请输入初始密码"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingEmployee}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">用工类型</label>
                    <select
                      className="form-select"
                      value={formData.employeeProfile.employmentType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employeeProfile: {
                            ...formData.employeeProfile,
                            employmentType: e.target.value as EmploymentType,
                          },
                        })
                      }
                    >
                      <option value={EmploymentType.FULL_TIME}>全职</option>
                      <option value={EmploymentType.PART_TIME}>兼职</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">时薪 (元/小时)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="请输入时薪"
                      value={formData.employeeProfile.hourlyRate || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employeeProfile: {
                            ...formData.employeeProfile,
                            hourlyRate: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">技能标签（用逗号分隔）</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例如：收银, 理货, 客服"
                    value={formData.employeeProfile.skillTags.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employeeProfile: {
                          ...formData.employeeProfile,
                          skillTags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEmployee ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
