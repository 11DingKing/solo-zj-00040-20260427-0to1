import mongoose from "mongoose";
import { SwapRequest, ISwapRequest, Shift, IShift } from "../models";
import { SwapRequestStatus, ShiftStatus } from "../config";

export interface CreateSwapRequestInput {
  requesterId: string;
  targetEmployeeId: string;
  requesterShiftId: string;
  targetShiftId: string;
  storeId: string;
  requesterNote?: string;
}

export const swapService = {
  async create(
    input: CreateSwapRequestInput,
  ): Promise<{ success: boolean; message: string; request?: ISwapRequest }> {
    const { requesterShiftId, targetShiftId, requesterId, targetEmployeeId } =
      input;

    const requesterShift = await Shift.findById(requesterShiftId);
    const targetShift = await Shift.findById(targetShiftId);

    if (!requesterShift || !targetShift) {
      return {
        success: false,
        message: "班次不存在",
      };
    }

    if (requesterShift.employeeId.toString() !== requesterId) {
      return {
        success: false,
        message: "你不能换不属于自己的班次",
      };
    }

    if (targetShift.employeeId.toString() !== targetEmployeeId) {
      return {
        success: false,
        message: "目标班次不属于目标员工",
      };
    }

    if (
      requesterShift.status !== ShiftStatus.CONFIRMED ||
      targetShift.status !== ShiftStatus.CONFIRMED
    ) {
      return {
        success: false,
        message: "只有已确认的班次才能申请换班",
      };
    }

    const existingRequest = await SwapRequest.findOne({
      $or: [
        {
          requesterShiftId,
          status: {
            $in: [SwapRequestStatus.PENDING, SwapRequestStatus.TARGET_APPROVED],
          },
        },
        {
          targetShiftId,
          status: {
            $in: [SwapRequestStatus.PENDING, SwapRequestStatus.TARGET_APPROVED],
          },
        },
      ],
    });

    if (existingRequest) {
      return {
        success: false,
        message: "该班次已有未处理的换班申请",
      };
    }

    const request = await SwapRequest.create({
      requesterId: new mongoose.Types.ObjectId(requesterId),
      targetEmployeeId: new mongoose.Types.ObjectId(targetEmployeeId),
      requesterShiftId: new mongoose.Types.ObjectId(requesterShiftId),
      targetShiftId: new mongoose.Types.ObjectId(targetShiftId),
      storeId: new mongoose.Types.ObjectId(input.storeId),
      status: SwapRequestStatus.PENDING,
      requesterNote: input.requesterNote,
    });

    return {
      success: true,
      message: "换班申请已创建",
      request,
    };
  },

  async getByRequester(
    requesterId: string,
    status?: SwapRequestStatus,
  ): Promise<{ success: boolean; message: string; requests: ISwapRequest[] }> {
    const query: Record<string, unknown> = {
      requesterId: new mongoose.Types.ObjectId(requesterId),
    };
    if (status) query.status = status;

    const requests = await SwapRequest.find(query)
      .populate("requesterId", "name phone avatar")
      .populate("targetEmployeeId", "name phone avatar")
      .populate("requesterShiftId")
      .populate("targetShiftId")
      .populate("managerActionBy", "name")
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: "获取成功",
      requests,
    };
  },

  async getByTargetEmployee(
    targetEmployeeId: string,
    status?: SwapRequestStatus,
  ): Promise<{ success: boolean; message: string; requests: ISwapRequest[] }> {
    const query: Record<string, unknown> = {
      targetEmployeeId: new mongoose.Types.ObjectId(targetEmployeeId),
    };
    if (status) query.status = status;

    const requests = await SwapRequest.find(query)
      .populate("requesterId", "name phone avatar")
      .populate("targetEmployeeId", "name phone avatar")
      .populate("requesterShiftId")
      .populate("targetShiftId")
      .populate("managerActionBy", "name")
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: "获取成功",
      requests,
    };
  },

  async getByStore(
    storeId: string,
    status?: SwapRequestStatus,
  ): Promise<{ success: boolean; message: string; requests: ISwapRequest[] }> {
    const query: Record<string, unknown> = {
      storeId: new mongoose.Types.ObjectId(storeId),
    };
    if (status) query.status = status;

    const requests = await SwapRequest.find(query)
      .populate("requesterId", "name phone avatar")
      .populate("targetEmployeeId", "name phone avatar")
      .populate("requesterShiftId")
      .populate("targetShiftId")
      .populate("managerActionBy", "name")
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: "获取成功",
      requests,
    };
  },

  async targetEmployeeApprove(
    requestId: string,
    targetEmployeeId: string,
    approve: boolean,
    note?: string,
  ): Promise<{ success: boolean; message: string; request?: ISwapRequest }> {
    const request = await SwapRequest.findById(requestId);
    if (!request) {
      return {
        success: false,
        message: "换班申请不存在",
      };
    }

    if (request.targetEmployeeId.toString() !== targetEmployeeId) {
      return {
        success: false,
        message: "你不是目标员工，无法操作",
      };
    }

    if (request.status !== SwapRequestStatus.PENDING) {
      return {
        success: false,
        message: "换班申请已处理",
      };
    }

    if (!approve) {
      request.status = SwapRequestStatus.REJECTED;
      request.targetEmployeeNote = note;
      await request.save();

      return {
        success: true,
        message: "已拒绝换班申请",
        request,
      };
    }

    request.status = SwapRequestStatus.TARGET_APPROVED;
    request.targetEmployeeApprovedAt = new Date();
    request.targetEmployeeNote = note;
    await request.save();

    const updatedRequest = await SwapRequest.findById(requestId)
      .populate("requesterId", "name phone avatar")
      .populate("targetEmployeeId", "name phone avatar")
      .populate("requesterShiftId")
      .populate("targetShiftId");

    return {
      success: true,
      message: "已同意换班申请，等待店长审批",
      request: updatedRequest || undefined,
    };
  },

  async managerApprove(
    requestId: string,
    managerId: string,
    approve: boolean,
    note?: string,
  ): Promise<{ success: boolean; message: string; request?: ISwapRequest }> {
    const request = await SwapRequest.findById(requestId);
    if (!request) {
      return {
        success: false,
        message: "换班申请不存在",
      };
    }

    if (request.status !== SwapRequestStatus.TARGET_APPROVED) {
      return {
        success: false,
        message: "换班申请需要目标员工同意后才能审批",
      };
    }

    const requesterShift = await Shift.findById(request.requesterShiftId);
    const targetShift = await Shift.findById(request.targetShiftId);

    if (!requesterShift || !targetShift) {
      return {
        success: false,
        message: "班次不存在",
      };
    }

    if (!approve) {
      request.status = SwapRequestStatus.REJECTED;
      request.managerActionBy = new mongoose.Types.ObjectId(managerId);
      request.managerActionAt = new Date();
      request.managerNote = note;
      await request.save();

      return {
        success: true,
        message: "已拒绝换班申请",
        request,
      };
    }

    const requesterEmployeeId = requesterShift.employeeId;
    const targetEmployeeId = targetShift.employeeId;

    requesterShift.employeeId = targetEmployeeId;
    targetShift.employeeId = requesterEmployeeId;

    await requesterShift.save();
    await targetShift.save();

    request.status = SwapRequestStatus.APPROVED;
    request.managerActionBy = new mongoose.Types.ObjectId(managerId);
    request.managerActionAt = new Date();
    request.managerNote = note;
    await request.save();

    const updatedRequest = await SwapRequest.findById(requestId)
      .populate("requesterId", "name phone avatar")
      .populate("targetEmployeeId", "name phone avatar")
      .populate("requesterShiftId")
      .populate("targetShiftId")
      .populate("managerActionBy", "name");

    return {
      success: true,
      message: "换班已完成",
      request: updatedRequest || undefined,
    };
  },
};
