import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  createTaskTemplateModuleAttribute,
  deleteTaskTemplateModuleAttribute,
  getAllTaskTemplateModuleAttributes,
  getTaskTemplateModuleAttributeById,
  getAllWithTaskTemplates,
  updateTaskTemplateModuleAttribute,
} from "../queries/taskTemplateModuleAttribute.query";

// Create
export const createTaskTemplateModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = uuidv4();
    const input = { id, ...req.body };
    const data = await createTaskTemplateModuleAttribute(input);
    res.status(201).json({
      success: true,
      message: "TaskTemplateModuleAttribute created successfully",
      data: data,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Read all
export const getAllTaskTemplateModuleAttributesController = async (
  _req: Request,
  res: Response
) => {
  try {
    const data = await getAllTaskTemplateModuleAttributes();
    res.status(200).json({
      success: true,
      message: "TaskTemplateModuleAttributes retrieved successfully",
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Read by id
export const getTaskTemplateModuleAttributeByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    const data = await getTaskTemplateModuleAttributeById(id);
    res.status(200).json({
      success: true,
      message: "TaskTemplateModuleAttribute retrieved successfully",
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Read by id
export const getTaskTemplateModuleAttributeByTaskTemplateIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    const data = await getAllWithTaskTemplates(id);
    res.status(200).json({
      success: true,
      message: "TaskTemplateModuleAttribute By TaskTemplateId retrieved successfully",
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update
export const updateTaskTemplateModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    const input = req.body;
    const data = await updateTaskTemplateModuleAttribute(id, input);
    res.status(200).json({
      success: true,
      message: "TaskTemplateModuleAttribute updated successfully",
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete
export const deleteTaskTemplateModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    await deleteTaskTemplateModuleAttribute(id);
    res.status(200).json({
      success: true,
      message: "TaskTemplateModuleAttribute deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
