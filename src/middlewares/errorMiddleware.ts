import type { Request, Response, NextFunction } from "express";
import type { CustomError } from "../types/customErrorInterface.js";
const errorMiddleware = async (
    error: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(error.message);
    res.status(error.status || 500).json({
        success: false,
        message: error.message,
        stack: error.stack,
    });
};

export { errorMiddleware };