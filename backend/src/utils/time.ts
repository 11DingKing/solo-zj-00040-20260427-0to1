import { parse, format, addDays, startOfWeek, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";

export const TIME_FORMAT = "HH:mm";
export const DATE_FORMAT = "yyyy-MM-dd";

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface DayTimeSlot extends TimeSlot {
  dayOfWeek: number;
}

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const roundToHalfHour = (minutes: number): number => {
  return Math.round(minutes / 30) * 30;
};

export const calculateDurationMinutes = (
  startTime: string,
  endTime: string,
): number => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return endMinutes - startMinutes;
};

export const calculateDurationHours = (
  startTime: string,
  endTime: string,
): number => {
  const durationMinutes = calculateDurationMinutes(startTime, endTime);
  return durationMinutes / 60;
};

export const doTimeSlotsOverlap = (
  slot1: TimeSlot,
  slot2: TimeSlot,
): boolean => {
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  return start1 < end2 && start2 < end1;
};

export const doDayTimeSlotsOverlap = (
  slot1: DayTimeSlot,
  slot2: DayTimeSlot,
): boolean => {
  if (slot1.dayOfWeek !== slot2.dayOfWeek) {
    return false;
  }
  return doTimeSlotsOverlap(slot1, slot2);
};

export const getWeekStartDate = (date: Date): Date => {
  return startOfWeek(date, { weekStartsOn: 1 });
};

export const getDateFromWeekDay = (
  weekStartDate: Date,
  dayOfWeek: number,
): Date => {
  return addDays(weekStartDate, dayOfWeek - 1);
};

export const formatDateForAPI = (date: Date): string => {
  return format(date, DATE_FORMAT);
};

export const parseDateFromAPI = (dateStr: string): Date => {
  return parse(dateStr, DATE_FORMAT, new Date());
};

export const isTimeWithinBusinessHours = (
  time: string,
  businessHours: { openTime: string; closeTime: string; isClosed: boolean },
): boolean => {
  if (businessHours.isClosed) {
    return false;
  }
  const timeMinutes = timeToMinutes(time);
  const openMinutes = timeToMinutes(businessHours.openTime);
  const closeMinutes = timeToMinutes(businessHours.closeTime);
  return timeMinutes >= openMinutes && timeMinutes <= closeMinutes;
};

export const isShiftWithinBusinessHours = (
  shift: TimeSlot,
  businessHours: { openTime: string; closeTime: string; isClosed: boolean },
): boolean => {
  if (businessHours.isClosed) {
    return false;
  }
  const shiftStart = timeToMinutes(shift.startTime);
  const shiftEnd = timeToMinutes(shift.endTime);
  const openMinutes = timeToMinutes(businessHours.openTime);
  const closeMinutes = timeToMinutes(businessHours.closeTime);
  return shiftStart >= openMinutes && shiftEnd <= closeMinutes;
};

export const getDayName = (dayOfWeek: number): string => {
  const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return dayNames[dayOfWeek];
};

export const generateHalfHourSlots = (
  startHour: number = 0,
  endHour: number = 24,
): string[] => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(minutesToTime(hour * 60));
    slots.push(minutesToTime(hour * 60 + 30));
  }
  return slots;
};
