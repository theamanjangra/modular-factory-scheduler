import { Request, Response } from "express";

import { v4 as uuidv4 } from "uuid";
import {
  createShift,
  getAllShifts,
  getShiftById,
  getAllShiftsName,
  updateShift,
  getAllAssignedShiftsTotheWeekDays,
  updateShiftWeek,
  deleteShift,
  getAllShiftsWithWorkersCount,
  getAllAvailableWorkers,
  getAllUnavailableWorkers,
  getWorkersNameWithShiftId,
  deleteShiftWeek,
  updateWorkerShiftIdBulk,
} from "../queries/shift.query";

// Create Shift
export const createShiftController = async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, lunchStartTime, lunchEndTime } = req.body;
    const id = uuidv4();

    const station = await createShift({
      id,
      name,
      startTime,
      endTime,
      lunchStartTime,
      lunchEndTime,
      weekdayOrdinals: [],
    });

    res.status(201).json({
      success: true,
      message: "Shift created successfully",
      data: station,
    });
  } catch (error: any) {
    console.error("Create shift error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const bulkUpdateWorkerShiftIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const { workerIds, shiftId } = req.body;

    if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "workerIds must be a non-empty array",
      });
    }

    const result = await updateWorkerShiftIdBulk(workerIds, shiftId);

    return res.status(200).json({
      success: true,
      message: "Workers updated successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

// Create Shift
export const updateShiftWeekController = async (
  req: Request,
  res: Response
) => {
  try {
    const { weekdayOrdinals } = req.body;
    const { id } = req.params;

    const station = await updateShiftWeek({
      id,
      weekdayOrdinals,
    });

    res.status(200).json({
      success: true,
      message: "Shift weekdays updated successfully",
      data: station,
    });
  } catch (error: any) {
    console.error("Update shift week error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteShiftWeekController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { weekdayOrdinals } = req.body;

    const station = await deleteShiftWeek({
      id,
      weekdayOrdinals,
    });

    res.status(200).json({
      success: true,
      message: "Shift weekdays updated successfully",
      data: station,
    });
  } catch (error: any) {
    console.error("Update shift week error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get All shifts
export const getAllShiftsController = async (_req: Request, res: Response) => {
  try {
    const shifts = await getAllShifts();
    res.status(200).json({
      success: true,
      data: { shifts: shifts },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkersNameWithShiftIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    const shifts = await getWorkersNameWithShiftId(id);
    res.status(200).json({
      success: true,
      data: shifts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllAssignedShiftsTotheWeekDaysController = async (
  _req: Request,
  res: Response
) => {
  try {
    const shifts = await getAllAssignedShiftsTotheWeekDays();
    res.status(200).json({
      success: true,
      data: { shifts: shifts },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllAvailableShiftsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const shifts = await getAllAvailableWorkers();
    res.status(200).json({
      success: true,
      data: { workers: shifts },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUnAvailableShiftsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const shifts = await getAllUnavailableWorkers();
    res.status(200).json({
      success: true,
      data: { shifts: shifts },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllShiftsWithWorkersCountController = async (
  _req: Request,
  res: Response
) => {
  try {
    const shifts = await getAllShiftsWithWorkersCount();
    res.status(200).json({
      success: true,
      data: { shifts: shifts },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllShiftsNameController = async (
  _req: Request,
  res: Response
) => {
  try {
    const shifts = await getAllShiftsName();
    res.status(200).json({
      success: true,
      data: { shifts: shifts },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single shift
export const getShiftByIDController = async (req: Request, res: Response) => {
  try {
    const shift = await getShiftById(req.params.id);
    if (!shift!) return res.status(404).json({ message: "Not found" });
    res.status(201).json({ success: true, data: shift });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Shift
export const updateShiftController = async (req: Request, res: Response) => {
  try {
    const shift = await updateShift(req.params.id, req.body);
    res.status(201).json({
      success: true,
      message: "Shift updated successfully",
      data: shift,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Shift
export const deleteShiftController = async (req: Request, res: Response) => {
  try {
    await deleteShift(req.params.id);
    res.status(200).json({
      success: true,
      message: "Shift deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
