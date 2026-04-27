import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { shiftApi } from '@/services/api';
import { IShift, ShiftStatus } from '@/types';
import { dayjs, getWeekStartDate, getWeekDates, getDayName, getShiftStatusText } from '@/utils';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';

const EmployeeView: React.FC = () => {
  const { setLoading, addNotification } = useAppStore();

  const [weekStartDate, setWeekStartDate] = useState(getWeekStartDate(dayjs()));
  const [shifts, setShifts] = useState<IShift[]>([]);
  const [loading, setLocalLoading] = useState(true);

  const weekDates = getWeekDates(weekStartDate);

  useEffect(() => {
    fetchShifts();
  }, [weekStartDate]);

  const fetchShifts = async () => {
    setLocalLoading(true);
    try {
      const weekStartStr = weekStartDate.format('YYYY-MM-DD');
      const result = await shiftApi.getByEmployeeAndWeek(weekStartStr);

      if (result.success && result.shifts) {
        setShifts(result.shifts as IShift[]);
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      addNotification('error', '获取排班数据失败');
    } finally {
      setLocalLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setWeekStartDate(weekStartDate.subtract(1, 'week'));
    } else {
      setWeekStartDate(weekStartDate.add(1, 'week'));
    }
  };

  const getShiftsForDay = (dayOfWeek: number): IShift[] => {
    return shifts.filter((shift) => shift.dayOfWeek === dayOfWeek);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
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
        </div>

        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {weekDates.map((date, index) => {
              const dayOfWeek = index === 6 ? 0 : index + 1;
              const dayShifts = getShiftsForDay(dayOfWeek);
              const isToday = date.isSame(dayjs(), 'day');

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">{getDayName(dayOfWeek)}</div>
                      <div className="text-sm text-gray-500">{date.format('MM/DD')}</div>
                    </div>
                    {isToday && <span className="badge badge-primary text-xs">今天</span>}
                  </div>

                  {dayShifts.length > 0 ? (
                    <div className="space-y-2">
                      {dayShifts.map((shift) => (
                        <div
                          key={shift._id}
                          className={`p-3 rounded-lg ${
                            shift.status === ShiftStatus.CONFIRMED ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {shift.startTime} - {shift.endTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span>{(shift.storeId as any).name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              {shift.durationHours.toFixed(1)} 小时
                            </span>
                            {getShiftStatusBadge(shift.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无排班</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">本周统计</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">总班次</span>
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="stat-card-value">{shifts.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">总工时</span>
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div className="stat-card-value">
                {shifts.reduce((sum, shift) => sum + shift.durationHours, 0).toFixed(1)} 小时
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">已确认</span>
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div className="stat-card-value">
                {shifts.filter((s) => s.status === ShiftStatus.CONFIRMED).length} 个
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeView;
