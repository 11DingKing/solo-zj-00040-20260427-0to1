import React, { useState, useEffect } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { swapApi, shiftApi } from '@/services/api';
import { ISwapRequest, IShift, SwapRequestStatus, UserRole } from '@/types';
import { dayjs, getShiftStatusText, getSwapStatusText } from '@/utils';
import { RefreshCw, CheckCircle, XCircle, MessageSquare, Send, ArrowRightLeft, Clock, MapPin, Calendar } from 'lucide-react';

const SwapRequests: React.FC = () => {
  const { user, currentStore } = useAuthStore();
  const { setLoading, addNotification } = useAppStore();

  const [sentRequests, setSentRequests] = useState<ISwapRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ISwapRequest[]>([]);
  const [allRequests, setAllRequests] = useState<ISwapRequest[]>([]);
  const [loading, setLocalLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'all'>('sent');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isEmployee = user?.role === UserRole.EMPLOYEE;
  const isManager = user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN;

  useEffect(() => {
    fetchRequests();
  }, [user, currentStore]);

  const fetchRequests = async () => {
    setLocalLoading(true);
    try {
      if (isEmployee) {
        const [sentResult, receivedResult] = await Promise.all([
          swapApi.getSent(),
          swapApi.getReceived(),
        ]);

        if (sentResult.success && sentResult.requests) {
          setSentRequests(sentResult.requests as ISwapRequest[]);
        }
        if (receivedResult.success && receivedResult.requests) {
          setReceivedRequests(receivedResult.requests as ISwapRequest[]);
        }
      } else if (isManager && currentStore) {
        const result = await swapApi.getByStore(currentStore._id);
        if (result.success && result.requests) {
          setAllRequests(result.requests as ISwapRequest[]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch swap requests:', error);
      addNotification('error', '获取换班申请失败');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleTargetApprove = async (requestId: string, approve: boolean) => {
    setLoading(true);
    try {
      const result = await swapApi.targetEmployeeApprove(requestId, approve);
      if (result.success) {
        addNotification('success', approve ? '已同意换班申请' : '已拒绝换班申请');
        fetchRequests();
      }
    } catch (error) {
      addNotification('error', '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleManagerApprove = async (requestId: string, approve: boolean) => {
    setLoading(true);
    try {
      const result = await swapApi.managerApprove(requestId, approve);
      if (result.success) {
        addNotification('success', approve ? '换班已批准' : '换班已拒绝');
        fetchRequests();
      }
    } catch (error) {
      addNotification('error', '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SwapRequestStatus): React.ReactNode => {
    let badgeClass = 'badge-secondary';
    switch (status) {
      case SwapRequestStatus.APPROVED:
        badgeClass = 'badge-success';
        break;
      case SwapRequestStatus.TARGET_APPROVED:
        badgeClass = 'badge-primary';
        break;
      case SwapRequestStatus.REJECTED:
        badgeClass = 'badge-danger';
        break;
      default:
        badgeClass = 'badge-warning';
    }
    return <span className={`badge ${badgeClass}`}>{getSwapStatusText(status)}</span>;
  };

  const renderRequestCard = (request: ISwapRequest, showActions: boolean = false) => {
    const requesterShift = request.requesterShiftId as unknown as IShift;
    const targetShift = request.targetShiftId as unknown as IShift;
    const requester = request.requesterId as unknown as { name: string };
    const targetEmployee = request.targetEmployeeId as unknown as { name: string };

    return (
      <div key={request._id} className="card mb-4">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">
                  {requester.name} → {targetEmployee.name}
                </div>
                <div className="text-sm text-gray-500">
                  申请时间：{dayjs(request.createdAt).format('YYYY-MM-DD HH:mm')}
                </div>
              </div>
            </div>
            {getStatusBadge(request.status)}
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-2">申请人班次</div>
              <div className="font-medium">{requester?.name}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Calendar className="w-4 h-4" />
                <span>{dayjs(requesterShift?.date).format('YYYY-MM-DD')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Clock className="w-4 h-4" />
                <span>
                  {requesterShift?.startTime} - {requesterShift?.endTime}
                </span>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium mb-2">目标班次</div>
              <div className="font-medium">{targetEmployee?.name}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Calendar className="w-4 h-4" />
                <span>{dayjs(targetShift?.date).format('YYYY-MM-DD')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Clock className="w-4 h-4" />
                <span>
                  {targetShift?.startTime} - {targetShift?.endTime}
                </span>
              </div>
            </div>
          </div>

          {request.requesterNote && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">申请备注：</span>
                <span>{request.requesterNote}</span>
              </div>
            </div>
          )}
        </div>

        {showActions && (
          <div className="card-footer">
            {isEmployee && request.status === SwapRequestStatus.PENDING && (
              <>
                <button
                  onClick={() => handleTargetApprove(request._id, false)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  拒绝
                </button>
                <button
                  onClick={() => handleTargetApprove(request._id, true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  同意
                </button>
              </>
            )}

            {isManager && request.status === SwapRequestStatus.TARGET_APPROVED && (
              <>
                <button
                  onClick={() => handleManagerApprove(request._id, false)}
                  className="btn btn-danger flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  拒绝
                </button>
                <button
                  onClick={() => handleManagerApprove(request._id, true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  批准
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">换班申请</h2>
        <div className="flex items-center gap-3">
          {isEmployee && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              发起换班申请
            </button>
          )}
          <button onClick={fetchRequests} className="btn btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {isEmployee && (
        <div className="card">
          <div className="card-body p-0">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'sent'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                我发起的 ({sentRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'received'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                发给我的 ({receivedRequests.length})
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'sent' &&
                (sentRequests.length > 0 ? (
                  sentRequests.map((req) => renderRequestCard(req))
                ) : (
                  <div className="empty-state">
                    <Send className="empty-state-icon" />
                    <p className="text-gray-500">暂无发起的换班申请</p>
                  </div>
                ))}

              {activeTab === 'received' &&
                (receivedRequests.length > 0 ? (
                  receivedRequests.map((req) => renderRequestCard(req, true))
                ) : (
                  <div className="empty-state">
                    <Send className="empty-state-icon" />
                    <p className="text-gray-500">暂无收到的换班申请</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {isManager && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">待审批</span>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="stat-card-value">
                {allRequests.filter((r) => r.status === SwapRequestStatus.TARGET_APPROVED).length}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">已批准</span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="stat-card-value">
                {allRequests.filter((r) => r.status === SwapRequestStatus.APPROVED).length}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">已拒绝</span>
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="stat-card-value">
                {allRequests.filter((r) => r.status === SwapRequestStatus.REJECTED).length}
              </div>
            </div>
          </div>

          {allRequests.length > 0 ? (
            allRequests.map((req) => renderRequestCard(req, true))
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <ArrowRightLeft className="empty-state-icon" />
                  <p className="text-gray-500">暂无换班申请</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">发起换班申请</h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">换班申请流程：</p>
                    <ol className="text-sm mt-2 space-y-1 list-decimal list-inside">
                      <li>选择你要换出的班次</li>
                      <li>选择目标员工和其对应的班次</li>
                      <li>目标员工同意后，店长审批</li>
                      <li>审批通过后自动交换班次</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-gray-500">请在排班页面选择具体班次后发起换班申请</p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapRequests;
