import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import localeZh from "dayjs/locale/zh-cn";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(weekOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);
dayjs.locale(localeZh);

export { dayjs };

export const TIME_FORMAT = "HH:mm";
export const DATE_FORMAT = "YYYY-MM-DD";
export const DATETIME_FORMAT = "YYYY-MM-DD HH:mm";

export const DAYS_OF_WEEK = [
  { value: 1, label: "周一", shortLabel: "一" },
  { value: 2, label: "周二", shortLabel: "二" },
  { value: 3, label: "周三", shortLabel: "三" },
  { value: 4, label: "周四", shortLabel: "四" },
  { value: 5, label: "周五", shortLabel: "五" },
  { value: 6, label: "周六", shortLabel: "六" },
  { value: 0, label: "周日", shortLabel: "日" },
];

export const timeToMinutes = (time: string): number => {
  if (!time) {
    return 0;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const calculateDuration = (
  startTime: string,
  endTime: string,
): number => {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
};

export const calculateDurationHours = (
  startTime: string,
  endTime: string,
): number => {
  return calculateDuration(startTime, endTime) / 60;
};

export const doTimeSlotsOverlap = (
  slot1: { startTime: string; endTime: string },
  slot2: { startTime: string; endTime: string },
): boolean => {
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  return start1 < end2 && start2 < end1;
};

export const getWeekStartDate = (
  date: dayjs.Dayjs | Date | string,
): dayjs.Dayjs => {
  return dayjs(date).startOf("week").add(1, "day");
};

export const getWeekDates = (weekStartDate: dayjs.Dayjs): dayjs.Dayjs[] => {
  const dates: dayjs.Dayjs[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(weekStartDate.add(i, "day"));
  }
  return dates;
};

export const getDateFromWeekDay = (
  weekStartDate: dayjs.Dayjs,
  dayOfWeek: number,
): dayjs.Dayjs => {
  const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return weekStartDate.add(adjustedDay, "day");
};

export const generateTimeSlots = (
  startHour: number = 6,
  endHour: number = 24,
  interval: number = 30,
): string[] => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      slots.push(minutesToTime(hour * 60 + minute));
    }
  }
  return slots;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
};

export const formatHours = (hours: number): string => {
  return hours.toFixed(1) + " 小时";
};

export const getDayName = (dayOfWeek: number): string => {
  const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return dayNames[dayOfWeek];
};

export const getShiftStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: "草稿",
    confirmed: "已确认",
    completed: "已完成",
  };
  return statusMap[status] || status;
};

export const getSwapStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "待对方确认",
    target_approved: "待店长审批",
    approved: "已通过",
    rejected: "已拒绝",
  };
  return statusMap[status] || status;
};

export const getAttendanceStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    on_time: "正常",
    late: "迟到",
    early_leave: "早退",
    absent: "缺勤",
    both_late_and_early: "迟到+早退",
  };
  return statusMap[status] || status;
};

export const getAttendanceStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    on_time: "text-green-600 bg-green-50",
    late: "text-yellow-600 bg-yellow-50",
    early_leave: "text-orange-600 bg-orange-50",
    absent: "text-red-600 bg-red-50",
    both_late_and_early: "text-red-600 bg-red-50",
  };
  return colorMap[status] || "text-gray-600 bg-gray-50";
};

export const getRoleText = (status: string): string => {
  const statusMap: Record<string, string> = {
    admin: "总管理员",
    manager: "门店店长",
    employee: "员工",
  };
  return statusMap[status] || status;
};

export const getEmploymentTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    full_time: "全职",
    part_time: "兼职",
  };
  return typeMap[type] || type;
};
