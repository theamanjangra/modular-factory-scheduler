import { Request, Response } from "express";
import { dataConnect } from "../config/dataConnectClient";

import {
  createInspectionArea,
  deleteInspectionArea,
  UpdateInspectionAreaOrder,
  updateInspectionArea,
  inspectionAreaCount,
  getInspectionAreaStationOrders,
  getInspectionAreaById,
} from "../queries/inspectionArea.query";
import { v4 as uuidv4 } from "uuid";

// ✅ Create Inspection Area
export const createInspectionAreaController = async (
  req: Request,
  res: Response
) => {
  try {
    const { name } = req.body;
    const id = uuidv4();
    const totalinspectionArea = await inspectionAreaCount();
    const order = totalinspectionArea + 1;
    console.log(totalinspectionArea);
    const inspectionArea = await createInspectionArea({ id, name, order });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: inspectionArea,
    });
  } catch (error: any) {
    console.error("Create inspection area error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Read Inspection Areas
export const getAllInspectionAreasStationsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const station = await getInspectionAreaStationOrders();
    res.status(200).json({
      success: true,
      data: { inspectionAreas: station },
    });
  } catch (error: any) {
    console.error("Get inspection area station error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getInspectionAreaByIDController = async (
  req: Request,
  res: Response
) => {
  try {
    const inspectionArea = await getInspectionAreaById(req.params.id);
    if (!inspectionArea) return res.status(404).json({ message: "Not found" });
    res.status(201).json({ success: true, data: inspectionArea });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Reorder Update

interface InspectionArea {
  id: string;
  inspectionOrder: number;
}

export const updateInspectionAreaOrderController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { oldOrder, newOrder } = req.body;
  const list: InspectionArea[] = await getInspectionAreaStationOrders();
  const updates: { id: string; inspectionOrder: number }[] = [];

  let between: InspectionArea[] = [];

  if (oldOrder < newOrder) {
    between = list.filter(
      (x: InspectionArea) =>
        x.inspectionOrder > oldOrder && x.inspectionOrder <= newOrder
    );
    between.forEach((x: InspectionArea) =>
      updates.push({ id: x.id, inspectionOrder: x.inspectionOrder - 1 })
    );
  } else {
    between = list.filter(
      (x: InspectionArea) =>
        x.inspectionOrder >= newOrder && x.inspectionOrder < oldOrder
    );
    between.forEach((x: InspectionArea) =>
      updates.push({ id: x.id, inspectionOrder: x.inspectionOrder + 1 })
    );
  }
  updates.push({ id, inspectionOrder: newOrder });
  try {
    await Promise.all(
      updates.map((item) =>
        UpdateInspectionAreaOrder(item.id, item.inspectionOrder)
      )
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder Inspection Area" });
  }
};

// Update Inspection Areas
export const updateInspectionAreasController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: "Inspection ID, name and order are required",
      });
    }

    const inspectionArea = await updateInspectionArea(id, { name });
    res.status(200).json({
      success: true,
      data: inspectionArea,
    });
  } catch (error: any) {
    console.error("Update inspection area error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete Inspection Areas
export const deleteInspectionAreasController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Inspection ID is required",
      });
    }
    await deleteInspectionArea(id);
    res.status(200).json({
      success: true,
      message: "Inspection Area deleted successfully",
    });
  } catch (error: any) {
    console.error("Update inspection area error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
