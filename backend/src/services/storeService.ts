import mongoose from "mongoose";
import { Store, IStore, User } from "../models";
import { ITimeSlotRequirement } from "../models/Store";

export interface CreateStoreInput {
  name: string;
  address: string;
  description?: string;
  businessHours?: IStore["businessHours"];
  timeSlotRequirements?: ITimeSlotRequirement[];
}

export interface UpdateStoreInput {
  name?: string;
  address?: string;
  description?: string;
  businessHours?: IStore["businessHours"];
  timeSlotRequirements?: ITimeSlotRequirement[];
  isActive?: boolean;
}

export const storeService = {
  async create(
    input: CreateStoreInput,
  ): Promise<{ success: boolean; message: string; store?: IStore }> {
    const { name, address } = input;

    const existingStore = await Store.findOne({ name });
    if (existingStore) {
      return {
        success: false,
        message: "门店名称已存在",
      };
    }

    const store = await Store.create({
      name,
      address,
      description: input.description,
      businessHours: input.businessHours,
      timeSlotRequirements: input.timeSlotRequirements || [],
      managerIds: [],
      employeeIds: [],
      isActive: true,
    });

    return {
      success: true,
      message: "门店创建成功",
      store,
    };
  },

  async update(
    storeId: string,
    input: UpdateStoreInput,
  ): Promise<{ success: boolean; message: string; store?: IStore }> {
    const store = await Store.findById(storeId);
    if (!store) {
      return {
        success: false,
        message: "门店不存在",
      };
    }

    if (input.name && input.name !== store.name) {
      const existingStore = await Store.findOne({
        name: input.name,
        _id: { $ne: storeId },
      });
      if (existingStore) {
        return {
          success: false,
          message: "门店名称已存在",
        };
      }
    }

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { $set: input },
      { new: true, runValidators: true },
    );

    return {
      success: true,
      message: "门店更新成功",
      store: updatedStore || undefined,
    };
  },

  async delete(
    storeId: string,
  ): Promise<{ success: boolean; message: string }> {
    const store = await Store.findById(storeId);
    if (!store) {
      return {
        success: false,
        message: "门店不存在",
      };
    }

    await Store.findByIdAndDelete(storeId);

    await User.updateMany(
      { "employeeProfile.storeIds": storeId },
      { $pull: { "employeeProfile.storeIds": storeId } },
    );

    await User.updateMany(
      { "managerProfile.storeIds": storeId },
      { $pull: { "managerProfile.storeIds": storeId } },
    );

    return {
      success: true,
      message: "门店删除成功",
    };
  },

  async getById(
    storeId: string,
  ): Promise<{ success: boolean; message: string; store?: IStore }> {
    const store = await Store.findById(storeId)
      .populate({
        path: "managerIds",
        select: "name phone avatar",
      })
      .populate({
        path: "employeeIds",
        select: "name phone avatar employeeProfile",
      });

    if (!store) {
      return {
        success: false,
        message: "门店不存在",
      };
    }

    return {
      success: true,
      message: "获取成功",
      store,
    };
  },

  async getAll(
    includeInactive: boolean = false,
  ): Promise<{ success: boolean; message: string; stores: IStore[] }> {
    const query = includeInactive ? {} : { isActive: true };
    const stores = await Store.find(query).sort({ createdAt: -1 }).populate({
      path: "managerIds",
      select: "name phone",
    });

    return {
      success: true,
      message: "获取成功",
      stores,
    };
  },

  async addManager(
    storeId: string,
    managerId: string,
  ): Promise<{ success: boolean; message: string; store?: IStore }> {
    const store = await Store.findById(storeId);
    const manager = await User.findById(managerId);

    if (!store) {
      return {
        success: false,
        message: "门店不存在",
      };
    }

    if (!manager || manager.role !== "manager") {
      return {
        success: false,
        message: "管理员不存在或角色不正确",
      };
    }

    if (store.managerIds.includes(new mongoose.Types.ObjectId(managerId))) {
      return {
        success: false,
        message: "该管理员已在门店中",
      };
    }

    store.managerIds.push(new mongoose.Types.ObjectId(managerId));
    await store.save();

    if (manager.managerProfile) {
      if (
        !manager.managerProfile.storeIds.includes(
          new mongoose.Types.ObjectId(storeId),
        )
      ) {
        manager.managerProfile.storeIds.push(
          new mongoose.Types.ObjectId(storeId),
        );
        await manager.save();
      }
    }

    const updatedStore = await Store.findById(storeId).populate("managerIds");

    return {
      success: true,
      message: "添加管理员成功",
      store: updatedStore || undefined,
    };
  },

  async removeManager(
    storeId: string,
    managerId: string,
  ): Promise<{ success: boolean; message: string; store?: IStore }> {
    const store = await Store.findById(storeId);
    const manager = await User.findById(managerId);

    if (!store) {
      return {
        success: false,
        message: "门店不存在",
      };
    }

    const managerObjectId = new mongoose.Types.ObjectId(managerId);
    const index = store.managerIds.findIndex(
      (id) => id.toString() === managerObjectId.toString(),
    );
    if (index === -1) {
      return {
        success: false,
        message: "该管理员不在门店中",
      };
    }

    store.managerIds.splice(index, 1);
    await store.save();

    if (manager && manager.managerProfile) {
      const storeObjectId = new mongoose.Types.ObjectId(storeId);
      const storeIndex = manager.managerProfile.storeIds.findIndex(
        (id) => id.toString() === storeObjectId.toString(),
      );
      if (storeIndex !== -1) {
        manager.managerProfile.storeIds.splice(storeIndex, 1);
        await manager.save();
      }
    }

    const updatedStore = await Store.findById(storeId).populate("managerIds");

    return {
      success: true,
      message: "移除管理员成功",
      store: updatedStore || undefined,
    };
  },

  async addEmployee(
    storeId: string,
    employeeId: string,
  ): Promise<{ success: boolean; message: string; store?: IStore }> {
    const store = await Store.findById(storeId);
    const employee = await User.findById(employeeId);

    if (!store) {
      return {
        success: false,
        message: "门店不存在",
      };
    }

    if (!employee || employee.role !== "employee") {
      return {
        success: false,
        message: "员工不存在或角色不正确",
      };
    }

    if (store.employeeIds.includes(new mongoose.Types.ObjectId(employeeId))) {
      return {
        success: false,
        message: "该员工已在门店中",
      };
    }

    store.employeeIds.push(new mongoose.Types.ObjectId(employeeId));
    await store.save();

    if (employee.employeeProfile) {
      const storeObjectId = new mongoose.Types.ObjectId(storeId);
      if (
        !employee.employeeProfile.storeIds.some(
          (id) => id.toString() === storeObjectId.toString(),
        )
      ) {
        employee.employeeProfile.storeIds.push(storeObjectId);
        await employee.save();
      }
    }

    const updatedStore = await Store.findById(storeId).populate({
      path: "employeeIds",
      select: "name phone avatar employeeProfile",
    });

    return {
      success: true,
      message: "添加员工成功",
      store: updatedStore || undefined,
    };
  },

  async removeEmployee(
    storeId: string,
    employeeId: string,
  ): Promise<{ success: boolean; message: string; store?: IStore }> {
    const store = await Store.findById(storeId);
    const employee = await User.findById(employeeId);

    if (!store) {
      return {
        success: false,
        message: "门店不存在",
      };
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    const index = store.employeeIds.findIndex(
      (id) => id.toString() === employeeObjectId.toString(),
    );
    if (index === -1) {
      return {
        success: false,
        message: "该员工不在门店中",
      };
    }

    store.employeeIds.splice(index, 1);
    await store.save();

    if (employee && employee.employeeProfile) {
      const storeObjectId = new mongoose.Types.ObjectId(storeId);
      const storeIndex = employee.employeeProfile.storeIds.findIndex(
        (id) => id.toString() === storeObjectId.toString(),
      );
      if (storeIndex !== -1) {
        employee.employeeProfile.storeIds.splice(storeIndex, 1);
        await employee.save();
      }
    }

    const updatedStore = await Store.findById(storeId).populate({
      path: "employeeIds",
      select: "name phone avatar employeeProfile",
    });

    return {
      success: true,
      message: "移除员工成功",
      store: updatedStore || undefined,
    };
  },
};
