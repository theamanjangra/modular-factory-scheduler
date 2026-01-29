import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getAllInspectionItemTemplates, getInspectionItemTemplateById } from '../queries/inspectionItemTemplate.query';

// Get All Task Templates
export const getAllInspectionItemTemplatesController = async (_req: Request, res: Response) => {
  try {
    const inspectionItemTemplates = await getAllInspectionItemTemplates();
    res.status(201).json(inspectionItemTemplates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single Task Template
export const getInspectionItemTemplateByIdController = async (req: Request, res: Response) => {
  try {
    const inspectionItemTemplates = await getInspectionItemTemplateById(req.params.id);
    if (!inspectionItemTemplates) return res.status(404).json({ message: 'Not found' });
    res.status(201).json({success: true,data:inspectionItemTemplates});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};