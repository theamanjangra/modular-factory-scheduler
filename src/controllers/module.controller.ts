import { Request, Response } from "express";
import {
  createModule,
  getAllModule,
  GetByIdModule,
  UpdateModule,
  getAllModuleCount,
  DeleteModule,
  UpdateModuleOrder,
} from "../queries/module.query";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";

// Create module
export const createModuleController = async (req: Request, res: Response) => {
  try {
    const { moduleProfileId, travelerId, travelerTemplateId, serialNumber } =
      req.body;
    const id = uuidv4();
    const orderCount = await getAllModuleCount();
    const order = orderCount + 1;
    const module = await createModule({
      id,
      moduleProfileId,
      travelerId,
      travelerTemplateId,
      order,
      serialNumber,
    });

    res.status(201).json({
      success: true,
      message: "module created successfully",
      data: module,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Create module error:", error);
      res.status(500).json({ success: false, error: error.message });
    } else {
      console.error("Create module error:", error);
      res.status(500).json({ success: false, error: "Unknown error occurred" });
    }
  }
};

// Read module
export const getAllModuleController = async (req: Request, res: Response) => {
  try {
    const module = await getAllModule();
    res.status(200).json({
      success: true,
      data: module,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Get module error:", error);
      res.status(500).json({ success: false, error: error.message });
    } else {
      console.error("Get module error:", error);
      res.status(500).json({ success: false, error: "Unknown error occurred" });
    }
  }
};

export const getByIdModuleController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "module Id is required",
      });
    }
    const data = await GetByIdModule(id);
    res.status(200).json({
      success: true,
      message: "module fetched successfully",
      data: data,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Get By Id module error:", error);
      res.status(500).json({ success: false, error: error.message });
    } else {
      console.error("Get By Id module error:", error);
      res.status(500).json({ success: false, error: "Unknown error occurred" });
    }
  }
};

// Update module
export const updateModuleController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      serialNumber,
      moduleProfileId,
      travelerId,
      travelerTemplateId,
      order,
    } = req.body;

    // Step 1: Update the record
    await UpdateModule(id, {
      serialNumber,
      moduleProfileId,
      travelerId,
      travelerTemplateId,
      order,
    });

    // Step 2: Fetch the updated record
    const updatedModule = await GetByIdModule(id);

    res.status(200).json({
      success: true,
      message: "Successfully updated the Module",
      data: updatedModule,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("update module error:", error);
      res.status(500).json({ success: false, error: error.message });
    } else {
      console.error("update module error:", error);
      res.status(500).json({ success: false, error: "Unknown error occurred" });
    }
  }
};

// Update module order

interface Module {
  id: string;
  order: number;
}

export const updateModuleOrderController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { oldOrder, newOrder } = req.body;

  const list: Module[] = await getAllModule();
  const updates: { id: string; order: number }[] = [];

  let between: Module[] = [];

  if (oldOrder < newOrder) {
    between = list.filter(
      (x: Module) => x.order > oldOrder && x.order <= newOrder
    );
    between.forEach((x: Module) =>
      updates.push({ id: x.id, order: x.order - 1 })
    );
  } else {
    between = list.filter(
      (x: Module) => x.order >= newOrder && x.order < oldOrder
    );
    between.forEach((x: Module) =>
      updates.push({ id: x.id, order: x.order + 1 })
    );
  }
  updates.push({ id, order: newOrder });
  try {
    await Promise.all(
      updates.map((item) => UpdateModuleOrder(item.id, item.order))
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder Module" });
  }
};

// Delete module
export const deleteModuleeaController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "module ID is required",
      });
    }
    await DeleteModule(id);
    res.status(200).json({
      success: true,
      message: "module deleted successfully",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("delete module error:", error);
      res.status(500).json({ success: false, error: error.message });
    } else {
      console.error("delete module error:", error);
      res.status(500).json({ success: false, error: "Unknown error occurred" });
    }
  }
};
