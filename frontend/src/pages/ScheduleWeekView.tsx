import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { shiftApi, userApi } from '@/services/api';
import { IShift, IUser, ShiftConflict, ShiftStatus, UserRole } from '@/types';
import {
  dayjs,
  getWeekStartDate,
  getWeekDates,
  timeToMinutes,
  minutesToTime,
  generateTimeSlots,
  getDayName,
  getShiftStatusText,
} from '@/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
} from 'lucide-react';

interface DraggingState {
  isDragging: boolean;
  employeeId: string;
  dayOfWeek: number;
  startMinutes: number;
  currentMinutes: number;
}

interface EditModalState {
  isOpen: boolean;
  shift: IShift | null;
}

const ScheduleWeekView: React.FC = () => {
  const { user, currentStore } = useAuthStore();
  const { setLoading, addNotification } = useAppStore();

  const [weekStartDate, setWeekStartDate] = useState(getWeekStartDate(dayjs()));
  const [employees, setEmployees] = useState<IUser[]>([]);
  const [shifts, setShifts] = useState<IShift[]>([]);
  const [conflicts, setConflicts] = useState<ShiftConflict[]>([]);
  const [loading, setLocalLoading] = useState(true);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [editModal, setEditModal] = useState<EditModalState>({ isOpen: false, shift: null });
  const [showConflictModal, setShowConflictModal] = useState(false);

  const weekDates = getWeekDates(weekStartDate);
  const timeSlots = generateTimeSlots(6, 24, 30);

  const fetchEmployees = useCallback(async () => {
    if (!currentStore) return;

    try {
      const result = await userApi.getStoreEmployees(currentStore._id);
      if (result.success && result.employees) {
        setEmployees(result.employees as IUser[]);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  }, [currentStore]);

  const fetchShifts = useCallback(async () => {
    if (!currentStore) return;

    setLocalLoading(true);
    try {
      const weekStartStr = weekStartDate.format('YYYY-MM-DD');
      const result = await shiftApi.getByStoreAndWeek(currentStore._id, weekStartStr);

      if (result.success && result.shifts) {
        setShifts(result.shifts as IShift[]);
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      addNotification('error', '获取排班数据失败');
    } finally {
      setLocalLoading(false);
    }
  }, [currentStore, weekStartDate, addNotification]);

  const checkConflicts = useCallback(async () => {
    if (!currentStore) return;

    try {
      const weekStartStr = weekStartDate.format('YYYY-MM-DD');
      const result = await shiftApi.checkConflicts(currentStore._id, weekStartStr);

      if (result.success && result.conflicts) {
        setConflicts(result.conflicts);
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  }, [currentStore, weekStartDate]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    checkConflicts();
  }, [checkConflicts, shifts]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setWeekStartDate(weekStartDate.subtract(1, 'week'));
    } else {
      setWeekStartDate(weekStartDate.add(1, 'week'));
    }
  };

  const getEmployeeShifts = (employeeId: string, dayOfWeek: number): IShift[] => {
    const adjustedDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    return shifts.filter(
      (shift) =>
        (shift.employeeId as unknown as IUser)._id === employeeId && shift.dayOfWeek === adjustedDay
    );
  };

  const hasConflict = (employeeId: string, dayOfWeek: number, startTime?: string, endTime?: string): boolean => {
    const adjustedDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    
    return conflicts.some((conflict) => {
      if (conflict.employeeId !== employeeId || conflict.dayOfWeek !== adjustedDay) {
        return false;
      }
      
      if (!startTime || !endTime) {
        return true;
      }
      
      const conflictStart = timeToMinutes(conflict.startTime);
      const conflictEnd = timeToMinutes(conflict.endTime);
      const shiftStart = timeToMinutes(startTime);
      const shiftEnd = timeToMinutes(endTime);
      
      return shiftStart < conflictEnd && shiftEnd > conflictStart;
    });
  };

  const getShiftStatusBadge = (status: ShiftStatus): React.ReactNode => {
    const badgeClass =
      status === ShiftStatus.CONFIRMED
        ? 'badge-success'
        : status === ShiftStatus.DRAFT
        ? 'badge-secondary'
        : 'badge-primary';

    return <span className={`badge ${badgeClass} text-xs`}>{getShiftStatusText(status)}</span>;
  };

  const handleCellMouseDown = (
    e: React.MouseEvent,
    employeeId: string,
    dayOfWeek: number,
    timeSlot: string
  ) => {
    e.preventDefault();
    const startMinutes = timeToMinutes(timeSlot);
    setDragging({
      isDragging: true,
      employeeId,
      dayOfWeek,
      startMinutes,
      currentMinutes: startMinutes,
    });
  };

  const handleCellMouseMove = (
    e: React.MouseEvent,
    employeeId: string,
    dayOfWeek: number,
    timeSlot: string
  ) => {
    if (!dragging || dragging.employeeId !== employeeId || dragging.dayOfWeek !== dayOfWeek) {
      return;
    }

    const currentMinutes = timeToMinutes(timeSlot);
    setDragging({
      ...dragging,
      currentMinutes: Math.max(dragging.startMinutes, currentMinutes),
    });
  };

  const handleMouseUp = async () => {
    if (!dragging) return;

    const { employeeId, dayOfWeek, startMinutes, currentMinutes } = dragging;
    const adjustedDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1;

    if (currentMinutes > startMinutes && currentStore) {
      const startTime = minutesToTime(startMinutes);
      const endTime = minutesToTime(currentMinutes);
      const weekStartStr = weekStartDate.format('YYYY-MM-DD');
      const shiftDate = weekDates[dayOfWeek].format('YYYY-MM-DD');

      try {
        const validation = await shiftApi.validate({
          employeeId,
          storeId: currentStore._id,
          dayOfWeek: adjustedDay,
          startTime,
          endTime,
          weekStartDate: weekStartStr,
        });

        if (!validation.isValid && validation.conflicts.length > 0) {
          addNotification('warning', `排班冲突: ${validation.conflicts.map((c) => c.conflictType).join(', ')}`);
          setDragging(null);
          return;
        }

        const result = await shiftApi.create({
          employeeId,
          storeId: currentStore._id,
          weekStartDate: new Date(weekStartStr),
          dayOfWeek: adjustedDay,
          date: new Date(shiftDate),
          startTime,
          endTime,
          checkConflict: false,
        } as any);

        if (result.success) {
          addNotification('success', '班次创建成功');
          fetchShifts();
        } else {
          addNotification('error', result.message || '创建班次失败');
        }
      } catch (error) {
        console.error('Failed to create shift:', error);
        addNotification('error', '创建班次失败');
      }
    }

    setDragging(null);
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const result = await shiftApi.delete(shiftId);
      if (result.success) {
        addNotification('success', '班次删除成功');
        fetchShifts();
        setEditModal({ isOpen: false, shift: null });
      }
    } catch (error) {
      addNotification('error', '删除班次失败');
    }
  };

  const handleConfirmWeek = async () => {
    if (!currentStore) return;

    setLoading(true);
    try {
      const weekStartStr = weekStartDate.format('YYYY-MM-DD');
      const result = await shiftApi.confirmWeekShifts(currentStore._id, weekStartStr);

      if (result.success) {
        addNotification('success', result.message);
        fetchShifts();
      }
    } catch (error) {
      addNotification('error', '确认排班失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSchedule = async () => {
    if (!currentStore) return;

    setLoading(true);
    try {
      const weekStartStr = weekStartDate.format('YYYY-MM-DD');
      const result = await shiftApi.automaticScheduling(currentStore._id, weekStartStr);

      if (result.success) {
        addNotification('success', result.message);
        fetchShifts();
      }
    } catch (error) {
      addNotification('error', '自动排班失败');
    } finally {
      setLoading(false);
    }
  };

  const getDraggingStyle = (
    employeeId: string,
    dayOfWeek: number,
    timeSlot: string
  ): React.CSSProperties => {
    if (
      !dragging ||
      dragging.employeeId !== employeeId ||
      dragging.dayOfWeek !== dayOfWeek
    ) {
      return {};
    }

    const slotMinutes = timeToMinutes(timeSlot);
    const minMinutes = Math.min(dragging.startMinutes, dragging.currentMinutes);
    const maxMinutes = Math.max(dragging.startMinutes, dragging.currentMinutes);

    if (slotMinutes >= minMinutes && slotMinutes <= maxMinutes) {
      return {
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        border: '2px dashed #3b82f6',
      };
    }

    return {};
  };

  return (
    <div className="space-y-6" onMouseUp={handleMouseUp}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {weekStartDate.format('YYYY年MM月DD日')} -{' '}
              {weekStartDate.add(6, 'day').format('MM月DD日')}
            </h3>
            <p className="text-sm text-gray-500">第 {weekStartDate.week()} 周</p>
          </div>

          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {conflicts.length > 0 && (
            <button
              onClick={() => setShowConflictModal(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-600">冲突 ({conflicts.length})</span>
            </button>
          )}

          <button
            onClick={handleAutoSchedule}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            自动排班
          </button>

          <button
            onClick={handleConfirmWeek}
            className="btn btn-primary flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            确认本周排班
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          {loading || employees.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                {employees.length === 0 ? (
                  <>
                    <Users className="empty-state-icon mx-auto" />
                    <p className="text-gray-500">暂无员工，请先添加员工</p>
                  </>
                ) : (
                  <>
                    <div className="spinner mx-auto mb-4" style={{ width: '3rem', height: '3rem' }}></div>
                    <p className="text-gray-500">加载中...</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="min-w-full">
              <div className="schedule-header">
                <div className="schedule-header-cell employee-col font-semibold">员工</div>
                {weekDates.map((date, index) => (
                  <div key={index} className="schedule-header-cell">
                    <div className="font-semibold">{getDayName(index === 6 ? 0 : index + 1)}</div>
                    <div className="text-sm text-gray-500">{date.format('MM/DD')}</div>
                  </div>
                ))}
              </div>

              <div className="schedule-body">
                {employees.map((employee) => (
                  <React.Fragment key={employee._id}>
                    <div className="schedule-cell employee-col border-r border-b">
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm">
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{employee.name}</div>
                          <div className="text-xs text-gray-500">
                            {employee.employeeProfile?.employmentType === 'full_time' ? '全职' : '兼职'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {weekDates.map((_, dayIndex) => {
                      const dayShifts = getEmployeeShifts(employee._id, dayIndex);

                      return (
                        <div
                          key={dayIndex}
                          className="schedule-cell relative"
                          style={{ minHeight: '80px' }}
                        >
                          <div className="flex flex-col gap-1">
                            {dayShifts.map((shift) => {
                              const isConflict = hasConflict(
                                employee._id,
                                dayIndex,
                                shift.startTime,
                                shift.endTime
                              );

                              return (
                                <div
                                  key={shift._id}
                                  onClick={() => setEditModal({ isOpen: true, shift })}
                                  className={`shift-block cursor-pointer ${
                                    isConflict ? 'conflict' : ''
                                  } ${shift.status === ShiftStatus.DRAFT ? 'draft' : 'confirmed'}`}
                                >
                                  <div className="font-medium">
                                    {shift.startTime} - {shift.endTime}
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    {getShiftStatusBadge(shift.status)}
                                    {isConflict && (
                                      <span className="text-xs">
                                        <AlertTriangle className="w-3 h-3 inline" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {timeSlots.map((timeSlot, slotIndex) => (
                            <div
                              key={slotIndex}
                              className="absolute left-0 right-0 h-4 cursor-crosshair"
                              style={{
                                top: `${(timeToMinutes(timeSlot) - 360) / 10}px`,
                                ...getDraggingStyle(employee._id, dayIndex, timeSlot),
                              }}
                              onMouseDown={(e) =>
                                handleCellMouseDown(e, employee._id, dayIndex, timeSlot)
                              }
                              onMouseMove={(e) =>
                                handleCellMouseMove(e, employee._id, dayIndex, timeSlot)
                              }
                            />
                          ))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">操作说明</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">1</span>
              </div>
              <div>
                <div className="font-medium text-gray-800">拖拽创建班次</div>
                <p>在员工对应的日期列中，按住鼠标拖拽选择开始和结束时间</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-xs">2</span>
              </div>
              <div>
                <div className="font-medium text-gray-800">点击编辑班次</div>
                <p>点击已创建的班次块可以查看详情、编辑或删除</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-xs">3</span>
              </div>
              <div>
                <div className="font-medium text-gray-800">确认排班</div>
                <p>排班完成后点击「确认本周排班」，员工即可查看</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editModal.isOpen && editModal.shift && (
        <div className="modal-overlay" onClick={() => setEditModal({ isOpen: false, shift: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">班次详情</h3>
              <button
                onClick={() => setEditModal({ isOpen: false, shift: null })}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">员工</label>
                    <p className="font-medium">
                      {(editModal.shift.employeeId as unknown as IUser).name}
                    </p>
                  </div>
                  <div>
                    <label className="form-label">日期</label>
                    <p className="font-medium">
                      {dayjs(editModal.shift.date).format('YYYY-MM-DD')} ({getDayName(editModal.shift.dayOfWeek)})
                    </p>
                  </div>
                  <div>
                    <label className="form-label">开始时间</label>
                    <p className="font-medium">{editModal.shift.startTime}</p>
                  </div>
                  <div>
                    <label className="form-label">结束时间</label>
                    <p className="font-medium">{editModal.shift.endTime}</p>
                  </div>
                  <div>
                    <label className="form-label">时长</label>
                    <p className="font-medium">{editModal.shift.durationHours.toFixed(1)} 小时</p>
                  </div>
                  <div>
                    <label className="form-label">状态</label>
                    <div>{getShiftStatusBadge(editModal.shift.status)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => handleDeleteShift(editModal.shift!._id)}
                className="btn btn-danger flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button
                onClick={() => setEditModal({ isOpen: false, shift: null })}
                className="btn btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showConflictModal && (
        <div className="modal-overlay" onClick={() => setShowConflictModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                排班冲突
              </h3>
              <button onClick={() => setShowConflictModal(false)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-3">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-yellow-800">{conflict.employeeName}</span>
                      <span className="badge badge-warning">
                        {conflict.conflictType === 'overlap' && '时间重叠'}
                        {conflict.conflictType === 'over_hours' && '超出工时限制'}
                        {conflict.conflictType === 'over_continuous' && '连续工作超时'}
                        {conflict.conflictType === 'unavailable' && '员工不可用'}
                      </span>
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">
                      {getDayName(conflict.dayOfWeek)} {conflict.startTime} - {conflict.endTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowConflictModal(false)} className="btn btn-primary">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleWeekView;
