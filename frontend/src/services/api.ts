import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import {
  ApiResponse,
  LoginCredentials,
  RegisterData,
  IUser,
  IStore,
  IShift,
  ShiftConflict,
  ISwapRequest,
  IAttendance,
  ISalary,
  DashboardData,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: async (
    credentials: LoginCredentials,
  ): Promise<ApiResponse<{ token: string; user: IUser }>> => {
    const response = await api.post("/api/auth/login", credentials);
    return response.data;
  },

  register: async (
    data: RegisterData,
  ): Promise<ApiResponse<{ token: string; user: IUser }>> => {
    const response = await api.post("/api/auth/register", data);
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<IUser>> => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },

  updatePassword: async (
    oldPassword: string,
    newPassword: string,
  ): Promise<ApiResponse> => {
    const response = await api.put("/api/auth/password", {
      oldPassword,
      newPassword,
    });
    return response.data;
  },
};

export const storeApi = {
  getAll: async (includeInactive = false): Promise<ApiResponse<IStore[]>> => {
    const response = await api.get("/api/stores", {
      params: { includeInactive },
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<IStore>> => {
    const response = await api.get(`/api/stores/${id}`);
    return response.data;
  },

  create: async (data: Partial<IStore>): Promise<ApiResponse<IStore>> => {
    const response = await api.post("/api/stores", data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<IStore>,
  ): Promise<ApiResponse<IStore>> => {
    const response = await api.put(`/api/stores/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/api/stores/${id}`);
    return response.data;
  },

  addManager: async (
    storeId: string,
    managerId: string,
  ): Promise<ApiResponse<IStore>> => {
    const response = await api.post(
      `/api/stores/${storeId}/managers/${managerId}`,
    );
    return response.data;
  },

  removeManager: async (
    storeId: string,
    managerId: string,
  ): Promise<ApiResponse<IStore>> => {
    const response = await api.delete(
      `/api/stores/${storeId}/managers/${managerId}`,
    );
    return response.data;
  },

  addEmployee: async (
    storeId: string,
    employeeId: string,
  ): Promise<ApiResponse<IStore>> => {
    const response = await api.post(
      `/api/stores/${storeId}/employees/${employeeId}`,
    );
    return response.data;
  },

  removeEmployee: async (
    storeId: string,
    employeeId: string,
  ): Promise<ApiResponse<IStore>> => {
    const response = await api.delete(
      `/api/stores/${storeId}/employees/${employeeId}`,
    );
    return response.data;
  },
};

export const userApi = {
  getEmployees: async (
    storeId?: string,
    search?: string,
  ): Promise<ApiResponse<IUser[]>> => {
    const response = await api.get("/api/users/employees", {
      params: { storeId, search },
    });
    return response.data;
  },

  getManagers: async (
    storeId?: string,
    search?: string,
  ): Promise<ApiResponse<IUser[]>> => {
    const response = await api.get("/api/users/managers", {
      params: { storeId, search },
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<IUser>> => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },

  updateEmployee: async (
    id: string,
    data: Partial<IUser>,
  ): Promise<ApiResponse<IUser>> => {
    const response = await api.put(`/api/users/employees/${id}`, data);
    return response.data;
  },

  updateManager: async (
    id: string,
    data: Partial<IUser>,
  ): Promise<ApiResponse<IUser>> => {
    const response = await api.put(`/api/users/managers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },

  updateAvailability: async (
    availability: unknown[],
  ): Promise<ApiResponse<IUser>> => {
    const response = await api.put("/api/users/availability", { availability });
    return response.data;
  },

  getStoreEmployees: async (storeId: string): Promise<ApiResponse<IUser[]>> => {
    const response = await api.get(`/api/users/store/${storeId}/employees`);
    return response.data;
  },
};

export const shiftApi = {
  getByStoreAndWeek: async (
    storeId: string,
    weekStartDate: string,
    status?: string,
  ): Promise<ApiResponse<IShift[]>> => {
    const response = await api.get(
      `/api/shifts/store/${storeId}/week/${weekStartDate}`,
      { params: { status } },
    );
    return response.data;
  },

  getByEmployeeAndWeek: async (
    weekStartDate: string,
  ): Promise<ApiResponse<IShift[]>> => {
    const response = await api.get(
      `/api/shifts/employee/week/${weekStartDate}`,
    );
    return response.data;
  },

  create: async (
    data: Partial<IShift> & { checkConflict?: boolean },
  ): Promise<ApiResponse<IShift & { conflicts?: ShiftConflict[] }>> => {
    const response = await api.post("/api/shifts", data);
    return response.data;
  },

  validate: async (data: {
    employeeId: string;
    storeId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    weekStartDate: string;
    excludeShiftId?: string;
  }): Promise<
    ApiResponse<{ isValid: boolean; conflicts: ShiftConflict[] }>
  > => {
    const response = await api.post("/api/shifts/validate", data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<IShift> & { checkConflict?: boolean },
  ): Promise<ApiResponse<IShift & { conflicts?: ShiftConflict[] }>> => {
    const response = await api.put(`/api/shifts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/api/shifts/${id}`);
    return response.data;
  },

  confirmWeekShifts: async (
    storeId: string,
    weekStartDate: string,
  ): Promise<ApiResponse> => {
    const response = await api.post(
      `/api/shifts/store/${storeId}/week/${weekStartDate}/confirm`,
    );
    return response.data;
  },

  automaticScheduling: async (
    storeId: string,
    weekStartDate: string,
  ): Promise<
    ApiResponse<{
      createdShifts: IShift[];
      unmetRequirements?: unknown[];
    }>
  > => {
    const response = await api.post(
      `/api/shifts/store/${storeId}/week/${weekStartDate}/automatic`,
    );
    return response.data;
  },

  checkConflicts: async (
    storeId: string,
    weekStartDate: string,
  ): Promise<ApiResponse<{ conflicts: ShiftConflict[] }>> => {
    const response = await api.get(
      `/api/shifts/store/${storeId}/week/${weekStartDate}/conflicts`,
    );
    return response.data;
  },
};

export const swapApi = {
  create: async (data: {
    requesterId: string;
    targetEmployeeId: string;
    requesterShiftId: string;
    targetShiftId: string;
    storeId: string;
    requesterNote?: string;
  }): Promise<ApiResponse<ISwapRequest>> => {
    const response = await api.post("/api/swaps", data);
    return response.data;
  },

  getSent: async (status?: string): Promise<ApiResponse<ISwapRequest[]>> => {
    const response = await api.get("/api/swaps/sent", { params: { status } });
    return response.data;
  },

  getReceived: async (
    status?: string,
  ): Promise<ApiResponse<ISwapRequest[]>> => {
    const response = await api.get("/api/swaps/received", {
      params: { status },
    });
    return response.data;
  },

  getByStore: async (
    storeId: string,
    status?: string,
  ): Promise<ApiResponse<ISwapRequest[]>> => {
    const response = await api.get(`/api/swaps/store/${storeId}`, {
      params: { status },
    });
    return response.data;
  },

  targetEmployeeApprove: async (
    requestId: string,
    approve: boolean,
    note?: string,
  ): Promise<ApiResponse<ISwapRequest>> => {
    const response = await api.post(`/api/swaps/${requestId}/approve-target`, {
      approve,
      note,
    });
    return response.data;
  },

  managerApprove: async (
    requestId: string,
    approve: boolean,
    note?: string,
  ): Promise<ApiResponse<ISwapRequest>> => {
    const response = await api.post(`/api/swaps/${requestId}/approve-manager`, {
      approve,
      note,
    });
    return response.data;
  },
};

export const attendanceApi = {
  clockIn: async (
    shiftId: string,
    clientTime: string,
  ): Promise<ApiResponse<IAttendance>> => {
    const response = await api.post("/api/attendance/clock-in", {
      shiftId,
      clientTime,
    });
    return response.data;
  },

  clockOut: async (
    shiftId: string,
    clientTime: string,
  ): Promise<ApiResponse<IAttendance>> => {
    const response = await api.post("/api/attendance/clock-out", {
      shiftId,
      clientTime,
    });
    return response.data;
  },

  getMyAttendances: async (
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<IAttendance[]>> => {
    const response = await api.get("/api/attendance/my", {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getByStore: async (
    storeId: string,
    startDate?: string,
    endDate?: string,
    employeeId?: string,
  ): Promise<ApiResponse<IAttendance[]>> => {
    const response = await api.get(`/api/attendance/store/${storeId}`, {
      params: { startDate, endDate, employeeId },
    });
    return response.data;
  },
};

export const salaryApi = {
  calculate: async (
    storeId: string,
    year: number,
    month: number,
  ): Promise<ApiResponse<ISalary[]>> => {
    const response = await api.post(
      `/api/salary/calculate/store/${storeId}/${year}/${month}`,
    );
    return response.data;
  },

  getByStore: async (
    storeId: string,
    year: number,
    month: number,
  ): Promise<ApiResponse<ISalary[]>> => {
    const response = await api.get(
      `/api/salary/store/${storeId}/${year}/${month}`,
    );
    return response.data;
  },

  getMySalary: async (
    year: number,
    month: number,
  ): Promise<ApiResponse<ISalary>> => {
    const response = await api.get(`/api/salary/my/${year}/${month}`);
    return response.data;
  },

  exportCSV: async (
    storeId: string,
    year: number,
    month: number,
  ): Promise<string> => {
    const response = await api.get(
      `/api/salary/export/store/${storeId}/${year}/${month}`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },
};

export const dashboardApi = {
  getData: async (targetDate?: string): Promise<ApiResponse<DashboardData>> => {
    const response = await api.get("/api/dashboard", {
      params: { targetDate },
    });
    return response.data;
  },

  getEmployeeData: async (): Promise<ApiResponse<DashboardData>> => {
    const response = await api.get("/api/dashboard/employee");
    return response.data;
  },
};

export default api;
