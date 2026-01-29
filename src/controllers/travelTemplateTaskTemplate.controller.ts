import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  createTravelerTemplateTaskTemplate,
  deleteTravelerTemplateTaskTemplate,
  getAllTravelerTemplateTaskTemplates,
  getTravelerTemplateTaskTemplateById,
  // getTravelerTemplateTaskTemplateById,
  getTravelerTemplateTaskTemplatesByTravelerId,
  updateTravelerTemplateTaskTemplate,
} from "../queries/travelerTemplateTaskTemplate.query";

// create 
export const createTravelerTemplateTaskTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = uuidv4();
    const input = { ...req.body, id };

    const travelTemplateTaskTemplate = await createTravelerTemplateTaskTemplate(
      {
        ...input,
        id,
      }
    );
    res.status(201).json(travelTemplateTaskTemplate);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Read all
export const getAllTravelerTemplateTaskTemplateController = async (
  _req: Request,
  res: Response
) => {
  try {
    const TravelerTemplateTaskTemplates =
      await getAllTravelerTemplateTaskTemplates();
    res.json(TravelerTemplateTaskTemplates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Read one
export const getTravelerTemplateTaskTemplateByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const TravelerTemplateTaskTemplates =
      await getTravelerTemplateTaskTemplateById(req.params.id);
    if (!TravelerTemplateTaskTemplates)
      return res.status(404).json({ message: "Not found" });
    res.json(TravelerTemplateTaskTemplates);
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
      await getTravelerTemplateTaskTemplatesByTravelerId(travelerTemplateId);

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Update
export const updateTravelerTemplateTaskTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    const TravelerTemplateTaskTemplates =
      await updateTravelerTemplateTaskTemplate(req.params.id, req.body);
    res.json(TravelerTemplateTaskTemplates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete
export const deleteTravelerTemplateTaskTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteTravelerTemplateTaskTemplate(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
