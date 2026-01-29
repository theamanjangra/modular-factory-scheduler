import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  createTravelerTemplateInspectionItemTemplate,
  deleteTravelerTemplateInspectionItemTemplate,
  getAllTravelerTemplateInspectionItemTemplates,
  getTravelerTemplateInspectionItemTemplateById,
  getTravelerTemplateInspectionTemplatesByTravelerId,
  updateTravelerTemplateInspectionItemTemplate,
} from "../queries/travelerTemplateInspectionItemTemplate.query";

// Create 
export const createTravelerTemplateInspectionItemTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = uuidv4();
    const input = { ...req.body, id };

    const travelTemplateInspectionItemTemplate =
      await createTravelerTemplateInspectionItemTemplate({
        ...input,
        id,
      });
    res.status(201).json(travelTemplateInspectionItemTemplate);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Read all
export const getAllTravelerTemplateInspectionItemTemplateController = async (
  _req: Request,
  res: Response
) => {
  try {
    const TravelerTemplateInspectionItemTemplates =
      await getAllTravelerTemplateInspectionItemTemplates();
    res.json(TravelerTemplateInspectionItemTemplates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Read by id
export const getTravelerTemplateInspectionItemTemplateByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const TravelerTemplateInspectionItemTemplates =
      await getTravelerTemplateInspectionItemTemplateById(req.params.id);
    if (!TravelerTemplateInspectionItemTemplates)
      return res.status(404).json({ message: "Not found" });
    res.json(TravelerTemplateInspectionItemTemplates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Read one by traveler id
export const getByTravelerTemplateIdController = async (req: Request,
  res: Response) => {
  try {
    const travelerTemplateId = req.params.travelerTemplateId;

    const data =
      await getTravelerTemplateInspectionTemplatesByTravelerId(travelerTemplateId);

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Update
export const updateTravelerTemplateInspectionItemTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    const TravelerTemplateInspectionItemTemplates =
      await updateTravelerTemplateInspectionItemTemplate(
        req.params.id,
        req.body
      );
    res.json(TravelerTemplateInspectionItemTemplates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete
export const deleteTravelerTemplateInspectionItemTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteTravelerTemplateInspectionItemTemplate(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
