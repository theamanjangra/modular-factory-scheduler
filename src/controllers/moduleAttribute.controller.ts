import { Request, Response } from "express";

import { v4 as uuidv4 } from "uuid";
import {
  createModuleAttribute,
  deleteModuleAttribute,
  getAllModuleAttribute,
  getModuleAttributeById,
  UpdateModuleAttribute,
} from "../queries/moduleAttribute.query";

// Create Module Attribute
export const createModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, moduleAttributeType } = req.body;
    const id = uuidv4();

    const moduleAttribute = await createModuleAttribute({
      id,
      name,
      moduleAttributeType: moduleAttributeType,
    });

    res.status(201).json({
      success: true,
      message: "Module Attribute created successfully",
      data: moduleAttribute,
    });
  } catch (error: any) {
    console.error("Create Module Attribute error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get All Module Attribute
export const getAllModuleAttributeController = async (
  _req: Request,
  res: Response
) => {
  try {
    const moduleAttribute = await getAllModuleAttribute();
    res.status(200).json({
      success: true,
      data: moduleAttribute,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single station
export const getModuleAttributeByIDController = async (
  req: Request,
  res: Response
) => {
  try {
    const ModuleAttribute = await getModuleAttributeById(req.params.id);
    if (!ModuleAttribute) return res.status(404).json({ message: "Not found" });
    res.status(201).json({ success: true, data: ModuleAttribute });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Station
export const updateModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const ModuleAttribute = await UpdateModuleAttribute(
      req.params.id,
      req.body
    );
    res.status(201).json({
      success: true,
      message: "Module Attribute updated successfully",
      data: ModuleAttribute,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Station
export const deleteModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteModuleAttribute(req.params.id);
    res.status(200).json({
      success: true,
      message: "Module Attribute deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
