import mongoose from "mongoose";
import { User, IUser, IAvailabilitySlot } from "../models";
import {
  UserRole,
  EmploymentType,
  FULL_TIME_MAX_HOURS_PER_WEEK,
  PART_TIME_MAX_HOURS_PER_WEEK,
} from "../config";

export interface UpdateEmployeeProfileInput {
  name?: string;
  phone?: string;
  email?: string;
  avatar?: string;

  employeeProfile?: {
    employmentType?: EmploymentType;
    hourlyRate?: number;
    storeIds?: string[];
    skillTags?: string[];
    availability?: IAvailabilitySlot[];
  };
}

export interface UpdateManagerProfileInput {
  name?: string;
  phone?: string;
  email?: string;
  avatar?: string;

  managerProfile?: {
    storeIds?: string[];
  };
}

export const userService = {
  async getById(
    userId: string,
  ): Promise<{ success: boolean; message: string; user?: IUser }> {
    const user = await User.findById(userId)
      .populate({
        path: "employeeProfile.storeIds",
        select: "name address isActive",
      })
      .populate({
        path: "managerProfile.storeIds",
        select: "name address isActive",
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

  async getAllEmployees(
    storeId?: string,
    search?: string,
  ): Promise<{ success: boolean; message: string; employees: IUser[] }> {
    let query: Record<string, unknown> = { role: UserRole.EMPLOYEE };

    if (storeId) {
      query["employeeProfile.storeIds"] = new mongoose.Types.ObjectId(storeId);
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query["$or"] = [{ name: searchRegex }, { phone: searchRegex }];
    }

    const employees = await User.find(query).sort({ createdAt: -1 }).populate({
      path: "employeeProfile.storeIds",
      select: "name address",
    });

    return {
      success: true,
      message: "获取成功",
      employees,
    };
  },

  async getAllManagers(
    storeId?: string,
    search?: string,
  ): Promise<{ success: boolean; message: string; managers: IUser[] }> {
    let query: Record<string, unknown> = { role: UserRole.MANAGER };

    if (storeId) {
      query["managerProfile.storeIds"] = new mongoose.Types.ObjectId(storeId);
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query["$or"] = [{ name: searchRegex }, { phone: searchRegex }];
    }

    const managers = await User.find(query).sort({ createdAt: -1 }).populate({
      path: "managerProfile.storeIds",
      select: "name address",
    });

    return {
      success: true,
      message: "获取成功",
      managers,
    };
  },

  async updateEmployeeProfile(
    userId: string,
    input: UpdateEmployeeProfileInput,
    isAdmin: boolean = false,
  ): Promise<{ success: boolean; message: string; user?: IUser }> {
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    if (user.role !== UserRole.EMPLOYEE) {
      return {
        success: false,
        message: "用户不是员工",
      };
    }

    const updateData: Record<string, unknown> = {};

    if (input.name) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.avatar !== undefined) updateData.avatar = input.avatar;

    if (input.phone && input.phone !== user.phone) {
      const existingUser = await User.findOne({
        phone: input.phone,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return {
          success: false,
          message: "手机号已被使用",
        };
      }
      updateData.phone = input.phone;
    }

    if (input.employeeProfile) {
      const employeeProfile = user.employeeProfile;
      if (employeeProfile) {
        const newEmployeeProfile = { ...employeeProfile.toObject() };

        if (isAdmin && input.employeeProfile.employmentType) {
          newEmployeeProfile.employmentType =
            input.employeeProfile.employmentType;
          newEmployeeProfile.weeklyHoursLimit =
            input.employeeProfile.employmentType === EmploymentType.FULL_TIME
              ? FULL_TIME_MAX_HOURS_PER_WEEK
              : PART_TIME_MAX_HOURS_PER_WEEK;
        }

        if (isAdmin && input.employeeProfile.hourlyRate !== undefined) {
          newEmployeeProfile.hourlyRate = input.employeeProfile.hourlyRate;
        }

        if (isAdmin && input.employeeProfile.storeIds) {
          newEmployeeProfile.storeIds = input.employeeProfile.storeIds.map(
            (id) => new mongoose.Types.ObjectId(id),
          );
        }

        if (input.employeeProfile.skillTags) {
          newEmployeeProfile.skillTags = input.employeeProfile.skillTags;
        }

        if (input.employeeProfile.availability) {
          newEmployeeProfile.availability = input.employeeProfile.availability;
        }

        updateData["employeeProfile"] = newEmployeeProfile;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate({
      path: "employeeProfile.storeIds",
      select: "name address",
    });

    return {
      success: true,
      message: "更新成功",
      user: updatedUser || undefined,
    };
  },

  async updateManagerProfile(
    userId: string,
    input: UpdateManagerProfileInput,
    isAdmin: boolean = false,
  ): Promise<{ success: boolean; message: string; user?: IUser }> {
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    if (user.role !== UserRole.MANAGER) {
      return {
        success: false,
        message: "用户不是店长",
      };
    }

    const updateData: Record<string, unknown> = {};

    if (input.name) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.avatar !== undefined) updateData.avatar = input.avatar;

    if (input.phone && input.phone !== user.phone) {
      const existingUser = await User.findOne({
        phone: input.phone,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return {
          success: false,
          message: "手机号已被使用",
        };
      }
      updateData.phone = input.phone;
    }

    if (isAdmin && input.managerProfile && input.managerProfile.storeIds) {
      const managerProfile = user.managerProfile;
      if (managerProfile) {
        updateData["managerProfile"] = {
          ...managerProfile.toObject(),
          storeIds: input.managerProfile.storeIds.map(
            (id) => new mongoose.Types.ObjectId(id),
          ),
        };
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate({
      path: "managerProfile.storeIds",
      select: "name address",
    });

    return {
      success: true,
      message: "更新成功",
      user: updatedUser || undefined,
    };
  },

  async deleteUser(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    if (user.role === UserRole.ADMIN) {
      const adminCount = await User.countDocuments({ role: UserRole.ADMIN });
      if (adminCount <= 1) {
        return {
          success: false,
          message: "至少需要保留一个管理员",
        };
      }
    }

    await User.findByIdAndDelete(userId);

    return {
      success: true,
      message: "用户删除成功",
    };
  },

  async updateAvailability(
    userId: string,
    availability: IAvailabilitySlot[],
  ): Promise<{ success: boolean; message: string; user?: IUser }> {
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    if (!user.employeeProfile) {
      return {
        success: false,
        message: "用户不是员工",
      };
    }

    user.employeeProfile.availability = availability;
    await user.save();

    const updatedUser = await User.findById(userId).populate({
      path: "employeeProfile.storeIds",
      select: "name address",
    });

    return {
      success: true,
      message: "可用时间更新成功",
      user: updatedUser || undefined,
    };
  },

  async getStoreEmployees(
    storeId: string,
  ): Promise<{ success: boolean; message: string; employees: IUser[] }> {
    const employees = await User.find({
      role: UserRole.EMPLOYEE,
      "employeeProfile.storeIds": new mongoose.Types.ObjectId(storeId),
    })
      .sort({ name: 1 })
      .populate({
        path: "employeeProfile.storeIds",
        select: "name",
      });

    return {
      success: true,
      message: "获取成功",
      employees,
    };
  },
};
