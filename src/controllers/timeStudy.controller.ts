import { Request, Response } from "express";

import { v4 as uuidv4 } from "uuid";

import {
  createTimeStudy,
  createTimeStudyModuleAttribute,
  getAllTaskTemplateNames,
  getAllTimeStudys,
  getTaskTemplateModuleAttributesByTaskTemplateId,
  getTimeStudyById,
  updateTimeStudy,
  deleteTimeStudy,
} from "../queries/timeStudy.query";

// Create Time Study
export const createTimeStudyController = async (
  req: Request,
  res: Response
) => {
  try {
    const { moduleId, taskTemplateId, notes, date, clockTime, workerCount } =
      req.body;
    const id = uuidv4();

    const timeStudy = await createTimeStudy({
      id,
      moduleId,
      taskTemplateId,
      notes,
      date,
      clockTime,
      workerCount,
    });

    res.status(201).json({
      success: true,
      message: "Time Study created successfully",
      data: timeStudy,
    });
  } catch (error: any) {
    console.error("Create time study error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createTimeStudyModuleAttributeController = async (
  req: Request,
  res: Response
) => {
  try {
    const { moduleAttributeId, value } = req.body;
    const id = uuidv4();

    const timeStudyModuleAttribute = await createTimeStudyModuleAttribute({
      id,
      timeStudyId: req.body.timeStudyId,
      moduleAttributeId,
      value,
    });

    res.status(201).json({
      success: true,
      message: "Time Study Module Attribute created successfully",
      data: timeStudyModuleAttribute,
    });
  } catch (error: any) {
    console.error("Create time study module attribute error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllTaskTemplateNamesController = async (
  req: Request,
  res: Response
) => {
  try {
    const taskTemplates = await getAllTaskTemplateNames();
    res.status(200).json({
      success: true,
      data: { taskTemplates },
    });
  } catch (error: any) {
    console.error("Get all task template names error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTaskTemplateModuleAttributesByTaskTemplateIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const taskTemplateId = req.params.id;
    const moduleAttributes =
      await getTaskTemplateModuleAttributesByTaskTemplateId(taskTemplateId);
    res.status(200).json({
      success: true,
      data: { moduleAttributes },
    });
  } catch (error: any) {
    console.error("Get task template module attributes error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get All time studies
export const getAllTimeStudiesController = async (
  _req: Request,
  res: Response
) => {
  try {
    const timeStudies = await getAllTimeStudys();
    res.status(200).json({
      success: true,
      data: { timeStudies },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single station
export const getTimeStudyByIDController = async (
  req: Request,
  res: Response
) => {
  try {
    const timeStudy = await getTimeStudyById(req.params.id);
    if (!timeStudy) return res.status(404).json({ message: "Not found" });
    res.status(201).json({ success: true, data: timeStudy });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Time Study
export const updateTimeStudyController = async (
  req: Request,
  res: Response
) => {
  try {
    const timeStudy = await updateTimeStudy(req.params.id, req.body);
    res.status(201).json({
      success: true,
      message: "Time Study updated successfully",
      data: timeStudy,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Time Study
export const deleteTimeStudyController = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteTimeStudy(req.params.id);
    res.status(200).json({
      success: true,
      message: "Time Study deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
