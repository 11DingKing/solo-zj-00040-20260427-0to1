import React, { useState, useEffect } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { salaryApi } from '@/services/api';
import { ISalary, UserRole } from '@/types';
import { dayjs, formatCurrency, formatHours } from '@/utils';
import { DollarSign, Download, RefreshCw, Calendar, Search } from 'lucide-react';

const SalaryManagement: React.FC = () => {
  const { user, currentStore } = useAuthStore();
  const { setLoading, addNotification } = useAppStore();

  const [salaries, setSalaries] = useState<ISalary[]>([]);
  const [loading, setLocalLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);

  const isEmployee = user?.role === UserRole.EMPLOYEE;

  useEffect(() => {
    fetchSalaries();
  }, [currentStore, selectedYear, selectedMonth, user]);

  const fetchSalaries = async () => {
    if (isEmployee) return;
    if (!currentStore) return;

    setLocalLoading(true);
    try {
      const result = await salaryApi.getByStore(currentStore._id, selectedYear, selectedMonth);
      if (result.success && result.salaries) {
        setSalaries(result.salaries as ISalary[]);
      }
    } catch (error) {
      console.error('Failed to fetch salaries:', error);
      addNotification('error', '获取薪资数据失败');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!currentStore) return;

    setLoading(true);
    try {
      const result = await salaryApi.calculate(currentStore._id, selectedYear, selectedMonth);
      if (result.success && result.salaries) {
        setSalaries(result.salaries as ISalary[]);
        addNotification('success', '薪资计算完成');
      }
    } catch (error) {
      console.error('Failed to calculate salaries:', error);
      addNotification('error', '薪资计算失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentStore) return;

    try {
      const csvContent = await salaryApi.exportCSV(currentStore._id, selectedYear, selectedMonth);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `薪资报表_${selectedYear}年${selectedMonth}月.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addNotification('success', '导出成功');
    } catch (error) {
      console.error('Failed to export salaries:', error);
      addNotification('error', '导出失败');
    }
  };

  const getTotalStats = () => {
    return {
      totalBasePay: salaries.reduce((sum, s) => sum + s.totalBasePay, 0),
      totalDeduction: salaries.reduce((sum, s) => sum + s.totalDeductionAmount, 0),
      totalNetPay: salaries.reduce((sum, s) => sum + s.totalNetPay, 0),
      totalHours: salaries.reduce((sum, s) => sum + s.totalActualHours, 0),
    };
  };

  const totals = getTotalStats();

  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">薪资管理</h2>
        {!isEmployee && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                className="form-select w-auto"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
              <select
                className="form-select w-auto"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}月
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleCalculate} className="btn btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              计算薪资
            </button>
            <button onClick={handleExport} className="btn btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出 CSV
            </button>
          </div>
        )}
      </div>

      {!isEmployee && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">员工人数</span>
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            <div className="stat-card-value">{salaries.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">总工时</span>
              <Calendar className="w-5 h-5 text-green-500" />
            </div>
            <div className="stat-card-value">{formatHours(totals.totalHours)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">基本工资总额</span>
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <div className="stat-card-value">{formatCurrency(totals.totalBasePay)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">实发工资总额</span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="stat-card-value text-green-600">{formatCurrency(totals.totalNetPay)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {selectedYear}年{selectedMonth}月 薪资报表
          </h3>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
            </div>
          ) : salaries.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>员工</th>
                    <th>时薪</th>
                    <th>计划工时</th>
                    <th>实际工时</th>
                    <th>基本工资</th>
                    <th>扣款金额</th>
                    <th>实发工资</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((salary) => (
                    <tr key={salary._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-sm">
                            {(salary.employeeId as any).name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{(salary.employeeId as any).name}</span>
                        </div>
                      </td>
                      <td>{formatCurrency(salary.hourlyRate)}/小时</td>
                      <td>{formatHours(salary.totalScheduledHours)}</td>
                      <td>{formatHours(salary.totalActualHours)}</td>
                      <td className="font-medium">{formatCurrency(salary.totalBasePay)}</td>
                      <td>
                        {salary.totalDeductionAmount > 0 ? (
                          <span className="text-red-600">
                            -{formatCurrency(salary.totalDeductionAmount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="font-semibold text-green-600">
                        {formatCurrency(salary.totalNetPay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3}>合计</td>
                    <td>{formatHours(totals.totalHours)}</td>
                    <td>{formatCurrency(totals.totalBasePay)}</td>
                    <td className="text-red-600">-{formatCurrency(totals.totalDeduction)}</td>
                    <td className="text-green-600">{formatCurrency(totals.totalNetPay)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <DollarSign className="empty-state-icon" />
              <p className="text-gray-500 mb-4">暂无薪资数据</p>
              {!isEmployee && (
                <button onClick={handleCalculate} className="btn btn-primary">
                  计算薪资
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalaryManagement;
