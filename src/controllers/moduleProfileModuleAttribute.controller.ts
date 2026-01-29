import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  createModuleProfileModuleAttribute,
  deleteModuleProfileModuleAttribute,
  getAllModuleProfileModuleAttributes,
  getModuleProfileModuleAttributeById,
  updateModuleProfileModuleAttribute,
  getDataWithModuleProfile,
  deleteDataWithModuleProfile,
} from "../queries/moduleProfileModuleAttribute.query";

// Create
export const createModuleProfileModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = uuidv4();
    const input = { id, ...req.body };
    const data = await createModuleProfileModuleAttribute(input);
    res.status(201).json({
      success: true,
      message: "ModuleProfileModuleAttribute created successfully",
      data: data,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Read all
export const getAllModuleProfileModuleAttributesController = async (
  _req: Request,
  res: Response
) => {
  try {
    const data = await getAllModuleProfileModuleAttributes();
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Read by id
export const getModuleProfileModuleAttributeByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    const data = await getModuleProfileModuleAttributeById(id);
    if (!data) {
      return res
        .status(404)
        .json({ error: "ModuleProfileModuleAttribute not found" });
    }
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getDataWithModuleProfileByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    const data = await getDataWithModuleProfile(id);
    if (!data) {
      return res.status(404).json({ error: "ModuleProfile not found" });
    }
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const deleteDataWithModuleProfileByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing moduleProfileId in request params",
      });
    }

    const deletedCount = await deleteDataWithModuleProfile(id);
    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No ModuleProfileModuleAttribute found for this ID",
      });
    }

    return res.status(200).json({
      success: true,
      message: "ModuleProfileModuleAttributes deleted successfully",
      deletedCount,
    });
  } catch (error: any) {
    console.error("Error in delete controller:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};

// Update
export const updateModuleProfileModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    const input = req.body;
    const data = await updateModuleProfileModuleAttribute(id, input);
    if (!data) {
      return res
        .status(404)
        .json({ error: "ModuleProfileModuleAttribute not found" });
    }
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete
export const deleteModuleProfileModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    const data = await deleteModuleProfileModuleAttribute(id);
    if (!data) {
      return res
        .status(404)
        .json({ error: "ModuleProfileModuleAttribute not found" });
    }
    res.status(200).json({
      success: true,
      message: "ModuleProfileModuleAttribute deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
