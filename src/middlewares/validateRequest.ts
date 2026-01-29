import { AnyObjectSchema } from "yup";
import { Request, Response, NextFunction } from "express";

export const validateRequest = (schema: AnyObjectSchema) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await schema.validate(
      { body: req.body, params: req.params, query: req.query },
      { abortEarly: false }
    );
    next();
  } catch (err: any) {
    res.status(400).json({
      success: false,
      errors: err.errors,
    });
  }
};
