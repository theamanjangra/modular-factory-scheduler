import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createTravelerTemplate, deleteTravelerTemplate, getAllTravelerTemplates, getTravelerTemplateById, updateTravelerTemplate } from "../queries/travelerTemplate.query";

// ✅ Create Project
export const createTravelerTemplateController = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const id = uuidv4();

    const travelerTemplate = await createTravelerTemplate({ id, name });

    res.status(201).json({
      success: true,
      message: "Traveler Template created successfully",
      data: travelerTemplate,
    });
  } catch (error: any) {
    console.error("Create traveler template error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get All Projects
export const getAllTravelerTemplatesController = async (_req: Request, res: Response) => {
  try {
    const travelerTemplate = await getAllTravelerTemplates();
    res.status(200).json({
      success: true,
      data: travelerTemplate,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get Project by ID
export const getTravelerTemplateByIdController = async (req: Request, res: Response) => {
  try {
    const travelerTemplate = await getTravelerTemplateById(req.params.id);
    if (!travelerTemplate) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.status(200).json({ success: true, data: travelerTemplate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Update Project
export const updateTravelerTemplateController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: "Traveler template ID and name are required",
      });
    }

    const travelerTemplate = await updateTravelerTemplate(id, { name });

    res.status(200).json({
      success: true,
      message: "Traveler template updated successfully",
      data: travelerTemplate,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Delete Project
export const deleteTravelerTemplateController = async (req: Request, res: Response) => {
  try {
    await deleteTravelerTemplate(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
