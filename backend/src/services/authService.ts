import { User, IUser } from "../models";
import {
  hashPassword,
  comparePassword,
  generateToken,
  IJwtPayload,
} from "../utils";
import {
  UserRole,
  EmploymentType,
  FULL_TIME_MAX_HOURS_PER_WEEK,
  PART_TIME_MAX_HOURS_PER_WEEK,
} from "../config";
import mongoose from "mongoose";

export interface LoginInput {
  phone: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    avatar?: string;
  };
}

export interface RegisterInput {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  email?: string;

  employeeProfile?: {
    employmentType: EmploymentType;
    hourlyRate: number;
    storeIds: string[];
    skillTags?: string[];
  };

  managerProfile?: {
    storeIds: string[];
  };
}

export const authService = {
  async login(input: LoginInput): Promise<LoginResult> {
    const { phone, password } = input;

    const user = await User.findOne({ phone });
    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "密码错误",
      };
    }

    const token = generateToken({
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    });

    return {
      success: true,
      message: "登录成功",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    };
  },

  async register(input: RegisterInput): Promise<LoginResult> {
    const { phone, password, role } = input;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return {
        success: false,
        message: "手机号已被注册",
      };
    }

    const hashedPassword = await hashPassword(password);

    const userData: Partial<IUser> = {
      name: input.name,
      phone: input.phone,
      password: hashedPassword,
      role: input.role,
      email: input.email,
    };

    if (role === UserRole.EMPLOYEE && input.employeeProfile) {
      const weeklyHoursLimit =
        input.employeeProfile.employmentType === EmploymentType.FULL_TIME
          ? FULL_TIME_MAX_HOURS_PER_WEEK
          : PART_TIME_MAX_HOURS_PER_WEEK;

      userData.employeeProfile = {
        employmentType: input.employeeProfile.employmentType,
        hourlyRate: input.employeeProfile.hourlyRate,
        storeIds: input.employeeProfile.storeIds.map(
          (id) => new mongoose.Types.ObjectId(id),
        ),
        skillTags: input.employeeProfile.skillTags || [],
        availability: [],
        weeklyHoursLimit,
      };
    }

    if (role === UserRole.MANAGER && input.managerProfile) {
      userData.managerProfile = {
        storeIds: input.managerProfile.storeIds.map(
          (id) => new mongoose.Types.ObjectId(id),
        ),
      };
    }

    const user = await User.create(userData);

    const token = generateToken({
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    });

    return {
      success: true,
      message: "注册成功",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    };
  },

  async getCurrentUser(
    userId: string,
  ): Promise<{ success: boolean; message: string; user?: IUser }> {
    const user = await User.findById(userId)
      .populate({
        path: "employeeProfile.storeIds",
        select: "name address",
      })
      .populate({
        path: "managerProfile.storeIds",
        select: "name address",
      });

    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    return {
      success: true,
      message: "获取成功",
      user,
    };
  },

  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    const isOldPasswordValid = await comparePassword(
      oldPassword,
      user.password,
    );
    if (!isOldPasswordValid) {
      return {
        success: false,
        message: "原密码错误",
      };
    }

    const hashedNewPassword = await hashPassword(newPassword);
    user.password = hashedNewPassword;
    await user.save();

    return {
      success: true,
      message: "密码更新成功",
    };
  },

  async initAdmin(): Promise<void> {
    const existingAdmin = await User.findOne({ role: UserRole.ADMIN });
    if (existingAdmin) {
      console.log("管理员已存在");
      return;
    }

    const hashedPassword = await hashPassword("admin123");
    await User.create({
      name: "总管理员",
      phone: "13800138000",
      password: hashedPassword,
      role: UserRole.ADMIN,
      email: "admin@scheduling.com",
    });

    console.log("默认管理员已创建: 手机 13800138000, 密码 admin123");
  },
};
