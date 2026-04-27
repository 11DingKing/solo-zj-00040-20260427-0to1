import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { storeApi } from '@/services/api';
import { IStore } from '@/types';
import { Plus, Edit, Trash2, Store as StoreIcon, MapPin, Clock, Users } from 'lucide-react';

const StoreManagement: React.FC = () => {
  const { setLoading, addNotification } = useAppStore();

  const [stores, setStores] = useState<IStore[]>([]);
  const [loading, setLocalLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<IStore | null>(null);
  const [formData, setFormData] = useState<Partial<IStore>>({
    name: '',
    address: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLocalLoading(true);
    try {
      const result = await storeApi.getAll(true);
      if (result.success && result.stores) {
        setStores(result.stores as IStore[]);
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      addNotification('error', '获取门店列表失败');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingStore) {
        const result = await storeApi.update(editingStore._id, formData);
        if (result.success) {
          addNotification('success', '门店更新成功');
          fetchStores();
          closeModal();
        } else {
          addNotification('error', result.message || '更新失败');
        }
      } else {
        const result = await storeApi.create(formData as any);
        if (result.success) {
          addNotification('success', '门店创建成功');
          fetchStores();
          closeModal();
        } else {
          addNotification('error', result.message || '创建失败');
        }
      }
    } catch (error) {
      console.error('Failed to save store:', error);
      addNotification('error', '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (store: IStore) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      description: store.description,
      isActive: store.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (storeId: string) => {
    if (!window.confirm('确定要删除这个门店吗？')) return;

    setLoading(true);
    try {
      const result = await storeApi.delete(storeId);
      if (result.success) {
        addNotification('success', '门店删除成功');
        fetchStores();
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
    setEditingStore(null);
    setFormData({
      name: '',
      address: '',
      description: '',
      isActive: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">门店管理</h2>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          添加门店
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div key={store._id} className="card">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${store.isActive ? 'bg-blue-100' : 'bg-gray-100'}`}
                >
                  <StoreIcon
                    className={`w-5 h-5 ${store.isActive ? 'text-blue-600' : 'text-gray-400'}`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold">{store.name}</h3>
                  <span className={`badge text-xs ${store.isActive ? 'badge-success' : 'badge-secondary'}`}>
                    {store.isActive ? '营业中' : '已关闭'}
                  </span>
                </div>
              </div>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{store.address}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{(store.managerIds as unknown as IStore[]).length} 管理员</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{(store.employeeIds as unknown as IStore[]).length} 员工</span>
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button
                onClick={() => handleEdit(store)}
                className="btn btn-secondary btn-sm flex items-center gap-1"
              >
                <Edit className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => handleDelete(store._id)}
                className="btn btn-danger btn-sm flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </div>
          </div>
        ))}

        {stores.length === 0 && (
          <div className="col-span-full">
            <div className="card">
              <div className="card-body text-center py-12">
                <StoreIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">暂无门店</p>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                  添加第一个门店
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingStore ? '编辑门店' : '添加门店'}</h3>
              <button onClick={closeModal} className="modal-close">
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">门店名称 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="请输入门店名称"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">门店地址 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="请输入门店地址"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">描述</label>
                  <textarea
                    className="form-textarea"
                    placeholder="请输入门店描述"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">门店营业中</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStore ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManagement;
