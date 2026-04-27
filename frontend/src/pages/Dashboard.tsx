import React, { useState, useEffect } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { dashboardApi } from '@/services/api';
import { DashboardData, UserRole } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Store,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatHours } from '@/utils';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC = () => {
  const { user, currentStore } = useAuthStore();
  const { setLoading, addNotification } = useAppStore();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLocalLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLocalLoading(true);
      setLoading(true);
      try {
        const result =
          user?.role === UserRole.EMPLOYEE
            ? await dashboardApi.getEmployeeData()
            : await dashboardApi.getData();

        if (result.success && result.data) {
          setDashboardData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        addNotification('error', '获取统计数据失败');
      } finally {
        setLocalLoading(false);
        setLoading(false);
      }
    };

    fetchData();
  }, [user, currentStore, setLoading, addNotification]);

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: '3rem', height: '3rem' }}></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  const coverageData = dashboardData.weeklyCoverage;
  const attendanceData = dashboardData.attendanceRate;
  const laborCost = dashboardData.monthlyLaborCost;
  const hoursDistribution = dashboardData.storeHoursDistribution;

  const totalConfirmedShifts = coverageData.reduce((sum, item) => sum + item.confirmedShifts, 0);
  const totalScheduledShifts = coverageData.reduce((sum, item) => sum + item.scheduledShifts, 0);
  const avgAttendanceRate =
    attendanceData.length > 0
      ? attendanceData.reduce((sum, item) => sum + item.attendanceRate, 0) / attendanceData.length
      : 0;

  const chartData = hoursDistribution.map((item) => ({
    name: item.storeName,
    工时: item.totalHours,
  }));

  const attendanceChartData = attendanceData.map((item) => ({
    name: item.storeName,
    准时: item.onTime,
    迟到: item.late,
    缺勤: item.absent,
  }));

  const pieData = [
    { name: '准时', value: attendanceData.reduce((sum, item) => sum + item.onTime, 0) },
    { name: '迟到', value: attendanceData.reduce((sum, item) => sum + item.late, 0) },
    { name: '缺勤', value: attendanceData.reduce((sum, item) => sum + item.absent, 0) },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">本周排班数</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="stat-card-value">{totalScheduledShifts}</div>
          <div className="stat-card-change positive">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            已确认 {totalConfirmedShifts} 个班次
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">平均出勤率</span>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="stat-card-value">{avgAttendanceRate.toFixed(1)}%</div>
          <div className={`stat-card-change ${avgAttendanceRate >= 90 ? 'positive' : 'negative'}`}>
            {avgAttendanceRate >= 90 ? (
              <TrendingUp className="w-4 h-4 inline mr-1" />
            ) : (
              <AlertCircle className="w-4 h-4 inline mr-1" />
            )}
            {avgAttendanceRate >= 90 ? '表现良好' : '需要关注'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">本月人力成本</span>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="stat-card-value">{formatCurrency(laborCost.totalNetPay)}</div>
          <div className="stat-card-change text-secondary">
            基本工资 {formatCurrency(laborCost.totalBasePay)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">本周总工时</span>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="stat-card-value">
            {formatHours(hoursDistribution.reduce((sum, item) => sum + item.totalHours, 0))}
          </div>
          <div className="stat-card-change text-secondary">
            共 {hoursDistribution.length} 家门店
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">各门店工时分布</h3>
            <Store className="w-5 h-5 text-gray-400" />
          </div>
          <div className="card-body">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="工时" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <Store className="empty-state-icon" />
                <p>暂无工时数据</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">本周考勤统计</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="card-body">
            {pieData.length > 0 ? (
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 ml-4">
                  {pieData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm text-gray-600">
                        {item.name}: {item.value} 人次
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <Clock className="empty-state-icon" />
                <p>暂无考勤数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {coverageData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">本周各门店排班覆盖率</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>门店名称</th>
                    <th>计划排班数</th>
                    <th>已确认排班数</th>
                    <th>覆盖率</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageData.map((item) => (
                    <tr key={item.storeId}>
                      <td className="font-medium">{item.storeName}</td>
                      <td>{item.scheduledShifts}</td>
                      <td>{item.confirmedShifts}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${item.coverageRate >= 90 ? 'bg-green-500' : item.coverageRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${item.coverageRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{item.coverageRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${item.coverageRate >= 90 ? 'badge-success' : item.coverageRate >= 60 ? 'badge-warning' : 'badge-danger'}`}
                        >
                          {item.coverageRate >= 90 ? '良好' : item.coverageRate >= 60 ? '一般' : '较差'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {attendanceChartData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">各门店考勤对比</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="准时" fill="#22c55e" />
                <Bar dataKey="迟到" fill="#f59e0b" />
                <Bar dataKey="缺勤" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
