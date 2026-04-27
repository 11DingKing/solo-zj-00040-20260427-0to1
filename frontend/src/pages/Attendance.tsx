import React, { useState, useEffect } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { attendanceApi, shiftApi } from '@/services/api';
import { IAttendance, IShift, AttendanceStatus, UserRole, ShiftStatus } from '@/types';
import { dayjs, getAttendanceStatusText, getAttendanceStatusColor, formatHours, formatCurrency } from '@/utils';
import { Clock, Search, Filter, Calendar, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

const Attendance: React.FC = () => {
  const { user, currentStore } = useAuthStore();
  const { setLoading, addNotification } = useAppStore();

  const [attendances, setAttendances] = useState<IAttendance[]>([]);
  const [todayShifts, setTodayShifts] = useState<IShift[]>([]);
  const [loading, setLocalLoading] = useState(true);
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const isEmployee = user?.role === UserRole.EMPLOYEE;

  useEffect(() => {
    fetchData();
  }, [currentStore, startDate, endDate, selectedEmployee, user]);

  const fetchData = async () => {
    setLocalLoading(true);
    try {
      if (isEmployee) {
        const [attendancesResult] = await Promise.all([
          attendanceApi.getMyAttendances(startDate, endDate),
        ]);

        if (attendancesResult.success && attendancesResult.attendances) {
          setAttendances(attendancesResult.attendances as IAttendance[]);
        }
      } else if (currentStore) {
        const attendancesResult = await attendanceApi.getByStore(
          currentStore._id,
          startDate,
          endDate,
          selectedEmployee || undefined
        );

        if (attendancesResult.success && attendancesResult.attendances) {
          setAttendances(attendancesResult.attendances as IAttendance[]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
      addNotification('error', '获取考勤数据失败');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClockIn = async (shiftId: string) => {
    setLoading(true);
    try {
      const result = await attendanceApi.clockIn(shiftId, new Date().toISOString());
      if (result.success) {
        addNotification('success', '签到成功！');
        fetchData();
      } else {
        addNotification('error', result.message || '签到失败');
      }
    } catch (error: any) {
      addNotification('error', error.response?.data?.message || '签到失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (shiftId: string) => {
    setLoading(true);
    try {
      const result = await attendanceApi.clockOut(shiftId, new Date().toISOString());
      if (result.success) {
        addNotification('success', '签退成功！');
        fetchData();
      } else {
        addNotification('error', result.message || '签退失败');
      }
    } catch (error: any) {
      addNotification('error', error.response?.data?.message || '签退失败');
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const total = attendances.length;
    const onTime = attendances.filter((a) => a.status === AttendanceStatus.ON_TIME).length;
    const late = attendances.filter(
      (a) => a.status === AttendanceStatus.LATE || a.status === AttendanceStatus.BOTH_LATE_AND_EARLY
    ).length;
    const absent = attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;

    return { total, onTime, late, absent };
  };

  const stats = getStats();

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
        <h2 className="text-xl font-semibold">考勤管理</h2>
        <button onClick={fetchData} className="btn btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {!isEmployee && (
        <div className="card">
          <div className="card-body">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  className="form-input w-auto"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  className="form-input w-auto"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">总考勤记录</span>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div className="stat-card-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">准时</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="stat-card-value text-green-600">{stats.onTime}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">迟到/早退</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="stat-card-value text-yellow-600">{stats.late}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">缺勤</span>
            <RefreshCw className="w-5 h-5 text-red-500" />
          </div>
          <div className="stat-card-value text-red-600">{stats.absent}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">考勤记录</h3>
        </div>
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>日期</th>
                  {!isEmployee && <th>员工</th>}
                  <th>班次时间</th>
                  <th>签到</th>
                  <th>签退</th>
                  <th>实际工时</th>
                  <th>状态</th>
                  <th>扣款</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((attendance) => (
                  <tr key={attendance._id}>
                    <td>{dayjs(attendance.date).format('YYYY-MM-DD')}</td>
                    {!isEmployee && (
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-sm">
                            {(attendance.employeeId as any).name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{(attendance.employeeId as any).name}</span>
                        </div>
                      </td>
                    )}
                    <td>
                      {attendance.scheduledStartTime} - {attendance.scheduledEndTime}
                    </td>
                    <td>
                      {attendance.actualClockIn ? (
                        <div>
                          <div className="font-medium">
                            {dayjs(attendance.actualClockIn).format('HH:mm')}
                          </div>
                          {attendance.clockInMinutesLate > 0 && (
                            <div className="text-xs text-yellow-600">
                              迟到 {attendance.clockInMinutesLate} 分钟
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>
                      {attendance.actualClockOut ? (
                        <div>
                          <div className="font-medium">
                            {dayjs(attendance.actualClockOut).format('HH:mm')}
                          </div>
                          {attendance.clockOutMinutesEarly > 0 && (
                            <div className="text-xs text-yellow-600">
                              早退 {attendance.clockOutMinutesEarly} 分钟
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>{formatHours(attendance.actualWorkingHours)}</td>
                    <td>
                      <span className={`badge ${getAttendanceStatusColor(attendance.status)}`}>
                        {getAttendanceStatusText(attendance.status)}
                      </span>
                    </td>
                    <td>
                      {attendance.calculatedDeductionAmount > 0 ? (
                        <span className="text-red-600 font-medium">
                          -{formatCurrency(attendance.calculatedDeductionAmount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {attendances.length === 0 && (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <p className="text-gray-500">暂无考勤记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
