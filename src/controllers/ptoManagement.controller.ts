// import { firestore as db, authAdmin } from "../utils/firebase";
import {
  createPtoRequest,
  getPtoCount,
  getPtoRequests,
  updatePtoRequest,
} from "../queries/ptoManagement.query";
import { Request, Response, NextFunction } from "express";
import { validateUpdatePTO } from "../utils/validators/ptoValidator";

export const createPtoController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("req.body #createPtoController:", req.body);
    const validatedInput = await validateUpdatePTO(req.body);
    const ptoId = String(Math.floor(Date.now() / 1000));
    const dataPayload = {
      ...validatedInput,
      id: ptoId,
      hoursRequested: Number(validatedInput.hoursRequested),
    };

    const response = await createPtoRequest(dataPayload);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getAllPTO = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const DEFAULT_OFFSET = 0;
    const DEFAULT_LIMIT = 20;
    const offset = parseInt(req.query.offset as string) || DEFAULT_OFFSET;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const result = await getPtoRequests({ limit, offset });
    if (!result) {
      return res
        .status(404)
        .json({ success: true, message: "No PTO requests found.", data: [] });
    }
    const response = {
      success: true,
      message: "PTO Requests fetched successfully with user details.",
      data: result,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updatePtoRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ptoId = parseInt(req.params.id, 10);
    if (isNaN(ptoId)) {
      throw new Error(
        "Invalid PTO Request ID provided. ID must be an integer."
      );
    }
    const { startDate, endDate, status, type, hoursRequested, note } = req.body;
    const ptoUpdateData: any = { id: ptoId };
    if (startDate) ptoUpdateData.startDate = startDate;
    if (endDate) ptoUpdateData.endDate = endDate;
    if (status) ptoUpdateData.status = status;
    if (type) ptoUpdateData.type = type;
    if (hoursRequested) ptoUpdateData.hoursRequested = hoursRequested;
    if (note) ptoUpdateData.note = note;

    const ptoRequest = await updatePtoRequest(ptoUpdateData);

    const response = {
      success: true,
      message: `PTO Request ID ${ptoId} updated successfully.`,
      data: ptoRequest,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
